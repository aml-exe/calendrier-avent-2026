<#
  Petit serveur local pour regarder dist/ dans le navigateur : http://localhost:8080
  Ctrl+C pour arreter.
#>
param([int]$Port = 8080)
$racine = Join-Path $PSScriptRoot 'dist'
$types = @{ '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8';
            '.json' = 'application/json'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg';
            '.webp' = 'image/webp'; '.svg' = 'image/svg+xml'; '.mp3' = 'audio/mpeg'; '.ogg' = 'audio/ogg' }
$ecoute = New-Object System.Net.HttpListener
$ecoute.Prefixes.Add("http://localhost:$Port/")
$ecoute.Start()
Write-Host "Calendrier servi sur http://localhost:$Port/"
while ($ecoute.IsListening) {
  $ctx = $ecoute.GetContext()
  $chemin = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if (-not $chemin) { $chemin = 'index.html' }
  $fichier = [IO.Path]::GetFullPath((Join-Path $racine $chemin))
  if ($fichier.StartsWith([IO.Path]::GetFullPath($racine)) -and (Test-Path $fichier -PathType Leaf)) {
    $octets = [IO.File]::ReadAllBytes($fichier)
    $ext = [IO.Path]::GetExtension($fichier).ToLower()
    if ($types.ContainsKey($ext)) { $ctx.Response.ContentType = $types[$ext] }
    $ctx.Response.Headers.Add('Cache-Control', 'no-store')
    $ctx.Response.OutputStream.Write($octets, 0, $octets.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
