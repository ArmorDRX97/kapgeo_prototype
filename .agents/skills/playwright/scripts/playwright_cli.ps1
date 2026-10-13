# Windows equivalent of the official playwright_cli.sh; project-local and pinned.
# Run from the directory whose CLI configuration/output paths should be used.
$ErrorActionPreference = 'Stop'
if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
    throw 'Node.js/npm with npx.cmd is required. Check node --version and npm --version.'
}

$prototypeRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../../..')).Path
$previousCache = $env:npm_config_cache
$previousNotifier = $env:NO_UPDATE_NOTIFIER
try {
    if (-not $env:npm_config_cache) {
        $env:npm_config_cache = Join-Path $prototypeRoot '.tmp/design-environment/npm-cache'
    }
    $env:NO_UPDATE_NOTIFIER = '1'
    $playwrightArguments = @($args)
    $hasSession = @($playwrightArguments | Where-Object { $_ -match '^(--session|-s)(=|$)' }).Count -gt 0
    if (-not $hasSession -and $env:PLAYWRIGHT_CLI_SESSION) {
        $playwrightArguments = @('-s=' + $env:PLAYWRIGHT_CLI_SESSION) + $playwrightArguments
    }
    & npx.cmd --yes --ignore-scripts --package '@playwright/cli@0.1.22' playwright-cli @playwrightArguments
    $playwrightExitCode = $LASTEXITCODE
} finally {
    $env:npm_config_cache = $previousCache
    $env:NO_UPDATE_NOTIFIER = $previousNotifier
}
exit $playwrightExitCode
