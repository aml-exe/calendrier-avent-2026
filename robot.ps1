<#
  Le robot de publication, lance par GitHub Actions (planifie, a la main ou a chaque envoi).

  1. Relit l'etat deja publie (etat.json du site en ligne).
  2. Construit le calendrier selon le reglage MODE (normal | soiree).
     Les cases deja publiees restent ouvertes (choix : apres la soiree, on peut les relire).
  3. Verifie : aucune case publiee trop tot, aucune fuite de case fermee.
  4. Decide s'il faut publier (rien de nouveau = rien a faire : lancer deux fois ne change rien).
  5. Ecrit le journal du passage (resume GitHub Actions + journal dans etat.json).

  Reglages (variables du depot GitHub, onglet Settings > Secrets and variables > Actions > Variables) :
    MODE           normal (defaut) ou soiree
    SOIREE_DEPART  "AAAA-MM-JJ HH:mm", heure de Paris : ouverture de la case 1 en mode soiree

  Test local :
    .\robot.ps1 -EtatPrecedent aucun -Mode soiree -Depart "2026-11-16 21:30" -Maintenant "2026-11-16 21:42"
#>
param(
  [string]$Mode = $env:MODE,
  [string]$Depart = $env:SOIREE_DEPART,
  [string]$Site = $env:SITE_URL,
  [string]$EtatPrecedent,           # chemin d'un etat.json local, ou "aucun" (tests)
  [string]$Maintenant,              # "AAAA-MM-JJ HH:mm" heure de Paris simulee (tests)
  [switch]$Reinitialiser = ($env:REINITIALISER -eq 'true')
)

$ErrorActionPreference = 'Stop'
$racine = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
$fr = [Globalization.CultureInfo]::InvariantCulture
if (-not $Mode) { $Mode = 'normal' }
$Mode = $Mode.Trim().ToLower()
if ($Mode -notin @('normal', 'soiree')) { Write-Host "Reglage MODE inconnu : '$Mode' (attendu : normal ou soiree)"; exit 1 }
$declencheur = $env:GITHUB_EVENT_NAME
if (-not $declencheur) { $declencheur = 'local' }

# ---- 1. Etat deja publie ----
$prec = $null
if ($EtatPrecedent -eq 'aucun') {
  $prec = $null
} elseif ($EtatPrecedent) {
  $prec = [IO.File]::ReadAllText((Resolve-Path $EtatPrecedent), $utf8) | ConvertFrom-Json
} elseif ($Site) {
  $url = $Site.TrimEnd('/') + '/etat.json?t=' + [DateTime]::UtcNow.Ticks
  try {
    $rep = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
    $prec = [Text.Encoding]::UTF8.GetString($rep.RawContentStream.ToArray()) | ConvertFrom-Json
  } catch {
    $code = 0
    try { $code = [int]$_.Exception.Response.StatusCode } catch { }
    if ($code -eq 404) { Write-Host "Aucun etat publie pour l'instant (premier passage)." }
    else { Write-Host "Impossible de lire l'etat publie ($url) : $($_.Exception.Message)"; exit 1 }
  }
}
$deja = @()
if ($prec -and -not $Reinitialiser) { $deja = @($prec.ouvertes | ForEach-Object { [int]$_ }) }
if ($Reinitialiser) { Write-Host "Reinitialisation demandee : les cases ouvertes en avance sont refermees." }

# ---- 2. Construction ----
$reglages = @{ Mode = $Mode; DejaOuvertes = $deja }
if ($Depart) { $reglages.Depart = $Depart.Trim() }
if ($Maintenant) { $reglages.Maintenant = $Maintenant }
& (Join-Path $racine 'build.ps1') @reglages
$etat = [IO.File]::ReadAllText((Join-Path $racine 'dist/etat.json'), $utf8) | ConvertFrom-Json
$ouvertes = @($etat.ouvertes | ForEach-Object { [int]$_ })

# ---- 3a. Jamais trop tot (controle independant du build) ----
$maintenantParis = $null
if ($Maintenant) { $maintenantParis = [DateTime]::ParseExact($Maintenant, 'yyyy-MM-dd HH:mm', $fr) }
else {
  foreach ($id in @('Europe/Paris', 'Romance Standard Time')) {
    try { $maintenantParis = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, [TimeZoneInfo]::FindSystemTimeZoneById($id)); break } catch { }
  }
}
$annee = [int](([IO.File]::ReadAllText((Join-Path $racine 'contenu/cases.json'), $utf8) | ConvertFrom-Json).annee)
$tropTot = @()
foreach ($n in $ouvertes) {
  if ($deja -contains $n) { continue }
  if ($Mode -eq 'normal') {
    if ($maintenantParis.Date -lt (New-Object DateTime($annee, 12, $n))) { $tropTot += $n }
  } else {
    $ouvreA = [DateTime]::ParseExact($Depart.Trim(), 'yyyy-MM-dd HH:mm', $fr).AddMinutes(5 * ($n - 1))
    if ($maintenantParis -lt $ouvreA) { $tropTot += $n }
  }
}
if ($tropTot.Count -gt 0) { Write-Host ("ERREUR : case(s) publiee(s) trop tot : " + ($tropTot -join ', ')); exit 1 }

# ---- 3b. Aucune fuite ----
& (Join-Path $racine 'verifier.ps1')
if ($LASTEXITCODE -ne 0) { exit 1 }

# ---- 4. Faut-il publier ? ----
$avant = @()
if ($prec) { $avant = @($prec.ouvertes | ForEach-Object { [int]$_ }) }
$nouvelles = @($ouvertes | Where-Object { $avant -notcontains $_ })
$change = (-not $prec) -or
  ($prec.version -ne $etat.version) -or ($prec.mode -ne $etat.mode) -or ($prec.depart -ne $etat.depart) -or
  ($prec.aujourdhui -ne $etat.aujourdhui) -or ($prec.dujour -ne $etat.dujour) -or ("$($prec.prochaine)" -ne "$($etat.prochaine)") -or
  (($avant -join ',') -ne ($ouvertes -join ','))

# ---- 5. Journal ----
$utc = [DateTime]::UtcNow
$entree = [ordered]@{
  utc         = $utc.ToString('yyyy-MM-ddTHH:mmZ')
  paris       = $maintenantParis.ToString('yyyy-MM-dd HH:mm')
  declencheur = $declencheur
  mode        = $Mode
  dujour      = $etat.dujour
  nouvelles   = $nouvelles
  ouvertes    = $ouvertes.Count
  publie      = [bool]$change
}
$journal = @()
if ($prec -and $prec.journal) { $journal = @($prec.journal) }
$journal = @(@($journal + (New-Object PSObject -Property $entree)) | Select-Object -Last 300)
$final = [ordered]@{}
foreach ($p in $etat.PSObject.Properties) { if ($p.Name -ne 'journal') { $final[$p.Name] = $p.Value } }
$final['ouvertes'] = [object[]]$ouvertes
$final['journal'] = [object[]]$journal
[IO.File]::WriteAllText((Join-Path $racine 'dist/etat.json'), (ConvertTo-Json -InputObject $final -Depth 5), $utf8)

$ligne = "{0} UTC ({1} a Paris) | declencheur : {2} | mode : {3} | case du jour : {4} | nouvelles cases : {5} | ouvertes : {6}/25 | {7}" -f `
  $utc.ToString('dd/MM HH:mm'), $maintenantParis.ToString('HH:mm'), $declencheur, $Mode, $etat.dujour,
  $(if ($nouvelles.Count) { $nouvelles -join ', ' } else { 'aucune' }), $ouvertes.Count,
  $(if ($change) { 'PUBLICATION' } else { 'rien de nouveau, pas de publication' })
Write-Host $ligne

if ($env:GITHUB_STEP_SUMMARY) {
  $md = @(
    "## Passage du robot",
    "",
    "| | |",
    "|---|---|",
    "| Heure | $($utc.ToString('dd/MM/yyyy HH:mm')) UTC, soit $($maintenantParis.ToString('HH:mm')) a Paris |",
    "| Declencheur | $declencheur |",
    "| Mode | $Mode$(if ($Mode -eq 'soiree') { " (depart $Depart)" }) |",
    "| Case du jour | $($etat.dujour) |",
    "| Nouvelles cases | $(if ($nouvelles.Count) { $nouvelles -join ', ' } else { 'aucune' }) |",
    "| Cases ouvertes | $($ouvertes.Count)/25 : $($ouvertes -join ', ') |",
    "| Version | $($etat.version) |",
    "| Resultat | $(if ($change) { 'publication' } else { 'rien de nouveau : le site reste tel quel' }) |"
  ) -join "`n"
  Add-Content -Path $env:GITHUB_STEP_SUMMARY -Value $md -Encoding utf8
}
if ($env:GITHUB_OUTPUT) {
  Add-Content -Path $env:GITHUB_OUTPUT -Value ("publier=" + $(if ($change) { 'true' } else { 'false' })) -Encoding utf8
}
exit 0
