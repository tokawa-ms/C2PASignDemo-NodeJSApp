[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\credentials')
)

$ErrorActionPreference = 'Stop'

$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $openssl) {
    $candidates = @(
        'C:\Program Files\Git\usr\bin\openssl.exe',
        'C:\Program Files\Git\mingw64\bin\openssl.exe',
        'C:\Program Files\OpenSSL-Win64\bin\openssl.exe'
    )
    $opensslPath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $opensslPath) {
        throw 'OpenSSL が見つかりません。OpenSSL または Git for Windows をインストールしてください。'
    }
} else {
    $opensslPath = $openssl.Source
}

$output = [System.IO.Path]::GetFullPath($OutputDirectory)
$files = @{
    RootKey = Join-Path $output 'dev-root-key.pem'
    RootCert = Join-Path $output 'dev-root-cert.pem'
    LeafKey = Join-Path $output 'dev-key.pem'
    LeafCsr = Join-Path $output 'dev-cert.csr'
    LeafCert = Join-Path $output 'dev-leaf-cert.pem'
    Chain = Join-Path $output 'dev-cert.pem'
    Serial = Join-Path $output 'dev-root-cert.srl'
}

$existing = $files.Values | Where-Object { Test-Path -LiteralPath $_ }
if ($existing) {
    throw "既存の資格情報があります。上書きせずに停止しました: $($existing -join ', ')"
}

New-Item -ItemType Directory -Force -Path $output | Out-Null
$extensionFile = Join-Path $output 'dev-cert-extensions.cnf'

try {
    @'
[v3_ca]
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer

[v3_leaf]
basicConstraints = critical, CA:false
keyUsage = critical, digitalSignature
extendedKeyUsage = emailProtection
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
'@ | Set-Content -LiteralPath $extensionFile -Encoding ascii

    & $opensslPath genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out $files.RootKey
    if ($LASTEXITCODE -ne 0) { throw '開発用ルート秘密鍵の生成に失敗しました。' }

    & $opensslPath req -new -x509 -sha256 -key $files.RootKey -out $files.RootCert `
        -days 3650 -subj '/C=JP/O=C2PA Demo/OU=Development/CN=C2PA Demo Development Root' `
        -extensions v3_ca -config $extensionFile
    if ($LASTEXITCODE -ne 0) { throw '開発用ルート証明書の生成に失敗しました。' }

    & $opensslPath genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out $files.LeafKey
    if ($LASTEXITCODE -ne 0) { throw '開発用署名秘密鍵の生成に失敗しました。' }

    & $opensslPath req -new -sha256 -key $files.LeafKey -out $files.LeafCsr `
        -subj '/C=JP/O=C2PA Demo/OU=Development/CN=C2PA Demo Development Signer'
    if ($LASTEXITCODE -ne 0) { throw '開発用署名証明書要求の生成に失敗しました。' }

    & $opensslPath x509 -req -sha256 -in $files.LeafCsr -CA $files.RootCert `
        -CAkey $files.RootKey -CAcreateserial -out $files.LeafCert -days 825 `
        -extfile $extensionFile -extensions v3_leaf
    if ($LASTEXITCODE -ne 0) { throw '開発用署名証明書の生成に失敗しました。' }

    Get-Content -LiteralPath $files.LeafCert, $files.RootCert |
        Set-Content -LiteralPath $files.Chain -Encoding ascii

    Remove-Item -LiteralPath $files.LeafCsr, $files.Serial -Force -ErrorAction SilentlyContinue
    Write-Host "開発用資格情報を生成しました: $output"
    Write-Host 'C2PA_CERT_PATH=./credentials/dev-cert.pem'
    Write-Host 'C2PA_PRIVATE_KEY_PATH=./credentials/dev-key.pem'
} finally {
    Remove-Item -LiteralPath $extensionFile -Force -ErrorAction SilentlyContinue
}
