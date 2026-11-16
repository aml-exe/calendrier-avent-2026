<#
  Fabrique le calendrier dans dist/.

  Regle de securite : seules les cases ouvertes sont ecrites dans la page.
  Une case fermee n'envoie que son numero et son heure d'ouverture.

  Deux rythmes :
    normal : une case par jour, a minuit heure de Paris (1er au 25 decembre)
    soiree : une case toutes les 5 minutes a partir de -Depart (heure de Paris)

  Exemples :
    .\build.ps1                                     # rythme normal, date du jour a Paris
    .\build.ps1 -Date 2026-12-12 -Dev               # simule le 12 decembre, mode construction
    .\build.ps1 -Mode soiree -Depart "2026-11-16 21:30"
    .\build.ps1 -DejaOuvertes 1,2,3                 # garde ouvertes des cases deja publiees
#>
param(
  [string]$Date,                 # AAAA-MM-JJ : date simulee (rythme normal)
  [switch]$Dev,                  # signale les cases sans contenu, affiche un bandeau
  [ValidateSet('normal', 'soiree')]
  [string]$Mode = 'normal',
  [string]$Depart,               # "AAAA-MM-JJ HH:mm", heure de Paris (mode soiree)
  [string]$Maintenant,           # "AAAA-MM-JJ HH:mm" : heure de Paris simulee (tests)
  [int[]]$DejaOuvertes = @()     # cases deja publiees qui restent ouvertes
)

$ErrorActionPreference = 'Stop'
$racine = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
$fr = [Globalization.CultureInfo]::InvariantCulture

function Get-HeureParis {
  foreach ($id in @('Europe/Paris', 'Romance Standard Time')) {
    try {
      $tz = [TimeZoneInfo]::FindSystemTimeZoneById($id)
      return [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $tz)
    } catch { }
  }
  throw "Fuseau horaire de Paris introuvable."
}

if ($Maintenant) { $heureParis = [DateTime]::ParseExact($Maintenant, 'yyyy-MM-dd HH:mm', $fr) }
else { $heureParis = Get-HeureParis }
if ($Date) { $aujourdhui = [DateTime]::ParseExact($Date, 'yyyy-MM-dd', $fr) }
else { $aujourdhui = $heureParis.Date }

$source = [IO.File]::ReadAllText((Join-Path $racine 'contenu/cases.json'), $utf8) | ConvertFrom-Json
$annee = [int]$source.annee

# ---- Quelles cases sont dues ? ----
$dues = @()
$dujour = 0
$ouvreA = @{}      # heure d'ouverture affichee pour chaque case fermee
if ($Mode -eq 'soiree') {
  if (-not $Depart) { throw "Mode soiree : il faut un instant de depart (-Depart 'AAAA-MM-JJ HH:mm')." }
  $debut = [DateTime]::ParseExact($Depart, 'yyyy-MM-dd HH:mm', $fr)
  $k = 0
  if ($heureParis -ge $debut) { $k = [Math]::Min(25, [int][Math]::Floor(($heureParis - $debut).TotalMinutes / 5) + 1) }
  if ($k -gt 0) { $dues = 1..$k; $dujour = $k }
  foreach ($n in 1..25) { $ouvreA[$n] = $debut.AddMinutes(5 * ($n - 1)).ToString('HH:mm') }
} else {
  foreach ($n in 1..25) {
    if ($aujourdhui -ge (New-Object DateTime($annee, 12, $n))) { $dues += $n }
  }
  if ($aujourdhui.Month -eq 12 -and $aujourdhui.Year -eq $annee -and $aujourdhui.Day -le 25) { $dujour = $aujourdhui.Day }
}
$garder = @($DejaOuvertes | Where-Object { $_ -ge 1 -and $_ -le 25 })
$ouvertes = @(@($dues) + $garder | Where-Object { $_ } | Sort-Object -Unique)

# ---- Donnees envoyees a la page ----
$publiees = @()
$manquantes = @()
$prochaine = $null
foreach ($n in 1..25) {
  $c = $source.cases | Where-Object { $_.jour -eq $n } | Select-Object -First 1
  $aContenu = $c -and $c.texte -and $c.titre
  if (-not $aContenu) { $manquantes += $n }

  if ($ouvertes -contains $n) {
    $sortie = [ordered]@{ jour = $n }
    if ($aContenu) {
      foreach ($champ in @('emoji', 'titre', 'texte', 'voeux', 'image', 'credit', 'lien')) {
        if ($c.$champ) { $sortie[$champ] = $c.$champ }
      }
    } else {
      $sortie['manquant'] = $true
    }
  } else {
    # Case fermee : uniquement son numero et quand elle s'ouvrira
    if ($Mode -eq 'soiree') { $sortie = [ordered]@{ jour = $n; ouvreA = $ouvreA[$n] } }
    else { $sortie = [ordered]@{ jour = $n; ouvreLe = (New-Object DateTime($annee, 12, $n)).ToString('yyyy-MM-dd') } }
    if ($Dev -and -not $aContenu) { $sortie['manquant'] = $true }
    if (-not $prochaine) { $prochaine = $n }
  }
  $publiees += New-Object PSObject -Property $sortie
}

# Point de sauvegarde publie : fourni par GitHub Actions, sinon lu dans git
$version = $env:GITHUB_SHA
if (-not $version) {
  try { $version = (git -C $racine rev-parse HEAD 2>$null) } catch { $version = $null }
}
if ($version) { $version = $version.Substring(0, 7) } else { $version = 'local' }

$donnees = [ordered]@{
  version    = $version
  construit  = $heureParis.ToString('yyyy-MM-ddTHH:mm')
  mode       = $Mode
  depart     = $Depart
  dujour     = $dujour
  prochaine  = $(if ($prochaine) { if ($Mode -eq 'soiree') { $ouvreA[$prochaine] } else { $prochaine } } else { $null })
  titre      = $source.titre
  annee      = $annee
  aujourdhui = $aujourdhui.ToString('yyyy-MM-dd')
  simulee    = [bool]($Date -or $Maintenant)
  dev        = [bool]$Dev
  cases      = $publiees
}
$json = (New-Object PSObject -Property $donnees) | ConvertTo-Json -Depth 5 -Compress
# Empeche toute sortie de la balise <script> qui contient les donnees
$json = $json.Replace('</', '<\/')

$dist = Join-Path $racine 'dist'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory $dist | Out-Null

Get-ChildItem (Join-Path $racine 'src') -File | ForEach-Object {
  if ($_.Name -eq 'index.html') {
    # ?v=<version> : force les telephones a recharger le script et le style apres chaque mise a jour
    $html = [IO.File]::ReadAllText($_.FullName, $utf8).Replace('__DONNEES__', $json).
      Replace('src="app.js"', "src=""app.js?v=$version""").Replace('href="style.css"', "href=""style.css?v=$version""")
    [IO.File]::WriteAllText((Join-Path $dist 'index.html'), $html, $utf8)
  } else {
    Copy-Item $_.FullName $dist
  }
}
$assets = Join-Path $racine 'src/assets'
if (Test-Path $assets) { Copy-Item $assets $dist -Recurse }

# Etat publie : relu par le robot au passage suivant
$etat = [ordered]@{
  version    = $version
  construit  = $donnees.construit
  mode       = $Mode
  depart     = $Depart
  aujourdhui = $donnees.aujourdhui
  dujour     = $dujour
  prochaine  = $donnees.prochaine
  ouvertes   = $ouvertes
}
[IO.File]::WriteAllText((Join-Path $dist 'etat.json'), ((New-Object PSObject -Property $etat) | ConvertTo-Json -Depth 4), $utf8)
[IO.File]::WriteAllText((Join-Path $dist 'version.txt'), "$version`n$($donnees.construit)`n$Mode`n", $utf8)

Write-Host ("Calendrier construit ({0}) le {1} : {2} case(s) ouverte(s) sur 25 [{3}], version {4}" -f `
  $Mode, $heureParis.ToString('dd/MM/yyyy HH:mm'), $ouvertes.Count, ($ouvertes -join ','), $version)
if ($manquantes.Count -gt 0) {
  Write-Warning ("Case(s) sans contenu : " + ($manquantes -join ', '))
}
