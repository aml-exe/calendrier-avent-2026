<#
  Fabrique le calendrier dans dist/ pour une date donnee.

  Regle de securite : seules les cases dont le jour est arrive (minuit, heure de Paris)
  sont ecrites dans la page. Une case future n'envoie que son numero et sa date d'ouverture.

  Exemples :
    .\build.ps1                         # date du jour a Paris
    .\build.ps1 -Date 2026-12-12 -Dev   # simule le 12 decembre, mode construction
#>
param(
  [string]$Date,   # format AAAA-MM-JJ ; vide = aujourd'hui a Paris
  [switch]$Dev     # signale les cases sans contenu et affiche la date simulee
)

$ErrorActionPreference = 'Stop'
$racine = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-DateParis {
  foreach ($id in @('Europe/Paris', 'Romance Standard Time')) {
    try {
      $tz = [TimeZoneInfo]::FindSystemTimeZoneById($id)
      return [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $tz).Date
    } catch { }
  }
  throw "Fuseau horaire de Paris introuvable."
}

if ($Date) {
  $aujourdhui = [DateTime]::ParseExact($Date, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
} else {
  $aujourdhui = Get-DateParis
}

$source = [IO.File]::ReadAllText((Join-Path $racine 'contenu/cases.json'), $utf8) | ConvertFrom-Json
$annee = [int]$source.annee

$publiees = @()
$manquantes = @()
foreach ($n in 1..25) {
  $c = $source.cases | Where-Object { $_.jour -eq $n } | Select-Object -First 1
  $ouvreLe = New-Object DateTime($annee, 12, $n)
  $aContenu = $c -and $c.texte -and $c.titre
  if (-not $aContenu) { $manquantes += $n }

  if ($aujourdhui -ge $ouvreLe) {
    # Case ouverte : son contenu est envoye
    $sortie = [ordered]@{ jour = $n }
    if ($aContenu) {
      foreach ($champ in @('emoji', 'titre', 'texte', 'voeux', 'image', 'credit', 'lien')) {
        if ($c.$champ) { $sortie[$champ] = $c.$champ }
      }
    } else {
      $sortie['manquant'] = $true
    }
  } else {
    # Case future : uniquement son numero et sa date d'ouverture
    $sortie = [ordered]@{ jour = $n; ouvreLe = $ouvreLe.ToString('yyyy-MM-dd') }
    if ($Dev -and -not $aContenu) { $sortie['manquant'] = $true }
  }
  $publiees += New-Object PSObject -Property $sortie
}

$donnees = [ordered]@{
  titre      = $source.titre
  annee      = $annee
  aujourdhui = $aujourdhui.ToString('yyyy-MM-dd')
  simulee    = [bool]$Date
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
    $html = [IO.File]::ReadAllText($_.FullName, $utf8).Replace('__DONNEES__', $json)
    [IO.File]::WriteAllText((Join-Path $dist 'index.html'), $html, $utf8)
  } else {
    Copy-Item $_.FullName $dist
  }
}
$assets = Join-Path $racine 'src/assets'
if (Test-Path $assets) { Copy-Item $assets $dist -Recurse }

$nbOuvertes = @($publiees | Where-Object { -not $_.ouvreLe }).Count
Write-Host ("Calendrier construit pour le {0} : {1} case(s) ouverte(s) sur 25 -> dist/index.html" -f $aujourdhui.ToString('dd/MM/yyyy'), $nbOuvertes)
if ($manquantes.Count -gt 0) {
  Write-Warning ("Case(s) sans contenu : " + ($manquantes -join ', '))
}
