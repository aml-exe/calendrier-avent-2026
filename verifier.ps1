<#
  Verifie que le site genere (dist/) ne contient AUCUN texte d'une case fermee.
  Les cases ouvertes sont lues dans dist/etat.json (ecrit par build.ps1), ou passees avec -Autorisees.
  Echoue (code 1) si une fuite est trouvee : dans GitHub Actions, rien n'est alors publie
  et l'ancienne version reste en ligne.
#>
param([int[]]$Autorisees)

$ErrorActionPreference = 'Stop'
$racine = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
$dist = Join-Path $racine 'dist'

if (-not $PSBoundParameters.ContainsKey('Autorisees')) {
  $etat = [IO.File]::ReadAllText((Join-Path $dist 'etat.json'), $utf8) | ConvertFrom-Json
  $Autorisees = @($etat.ouvertes)
}

$source = [IO.File]::ReadAllText((Join-Path $racine 'contenu/cases.json'), $utf8) | ConvertFrom-Json
$publie = ''
Get-ChildItem $dist -Recurse -File -Include *.html, *.js, *.json, *.txt, *.css | ForEach-Object {
  $publie += [IO.File]::ReadAllText($_.FullName, $utf8)
}
# Ajoute aussi les textes decodes des donnees JSON (apostrophes et accents echappes)
$m = [regex]::Match($publie, '<script type="application/json" id="donnees">(.*?)</script>', 'Singleline')
if ($m.Success) {
  $d = $m.Groups[1].Value | ConvertFrom-Json
  foreach ($c in $d.cases) { $publie += ' ' + $c.titre + ' ' + $c.texte + ' ' + $c.voeux }
}

$fuites = @()
foreach ($c in $source.cases) {
  if ($Autorisees -notcontains [int]$c.jour) {
    foreach ($champ in @('titre', 'texte', 'voeux')) {
      $v = $c.$champ
      if ($v -and $v.Length -ge 12 -and $publie.Contains($v.Substring(0, [Math]::Min(40, $v.Length)))) {
        $fuites += "case $($c.jour) ($champ)"
      }
    }
  }
}

if ($fuites.Count -gt 0) {
  Write-Host ("FUITE : contenu d'une case fermee trouve dans le site -> " + ($fuites -join ', '))
  exit 1
}
Write-Host ("OK : seules les cases ouvertes [{0}] ont un contenu dans le site." -f ($Autorisees -join ','))
exit 0
