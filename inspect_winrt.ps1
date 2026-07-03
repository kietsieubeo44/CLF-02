$path = "C:\Users\kiets\.gemini\antigravity-ide\brain\317f7c45-5189-454c-b044-153c4634e666\scratch\page_3_img_0.png"

# Load the assembly
[void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]

$fileOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync($path)
Write-Output "Type: $($fileOp.GetType().FullName)"
Write-Output "Members:"
$fileOp | Get-Member | Out-String | Write-Output
