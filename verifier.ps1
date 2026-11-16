<#
  Verifie que dist/index.html ne contient AUCUN texte de case future.
  Lance apres build.ps1 (meme date). Echoue (code 1) si une fuite est trouvee :
  dans GitHub Actions, la mise en ligne est alors annulee et l'ancienne version reste en place.

    .\verifier.ps1                 # date du jour a Paris
    .\verifier.ps1 -Date 2026-12-12
#>
param([string]$Date)

$ErrorActionPreference = 'Stop'
$racine = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)

if ($Date) {
  $aujourdhui = [DateTime]::ParseExact($Date, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
} else {
  $aujourdhui = $null
  foreach ($id in @('Europe/Paris', 'Romance Standard Time')) {
    try { $aujourdhui = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, [TimeZoneInfo]::FindSystemTimeZoneById($id)).Date; break } catch { }
  }
}

$source = [IO.File]::ReadAllText((Join-Path $racine 'contenu/cases.json'), $utf8) | ConvertFrom-Json
$publie = ''
Get-ChildItem (Join-Path $racine 'dist') -Recurse -File -Include *.html, *.js, *.json, *.txt, *.css | ForEach-Object {
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
  $ouvreLe = New-Object DateTime([int]$source.annee, 12, [int]$c.jour)
  if ($aujourdhui -lt $ouvreLe) {
    foreach ($champ in @('titre', 'texte', 'voeux')) {
      $v = $c.$champ
      if ($v -and $v.Length -ge 12 -and $publie.Contains($v.Substring(0, [Math]::Min(40, $v.Length)))) {
        $fuites += "case $($c.jour) ($champ)"
      }
    }
  }
}

if ($fuites.Count -gt 0) {
  Write-Host ("FUITE : contenu futur trouve dans le site publie -> " + ($fuites -join ', '))
  exit 1
}
Write-Host ("OK : aucune case future dans le site publie (date {0})." -f $aujourdhui.ToString('dd/MM/yyyy'))
exit 0
