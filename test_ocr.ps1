# Load WinRT classes
try {
    $OcrEngineType = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime]
    $SoftwareBitmapType = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
    $BitmapDecoderType = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
    $FileRandomAccessStreamType = [Windows.Storage.Streams.FileRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
    $StorageFileType = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
} catch {
    Write-Error "Failed to load WinRT types: $_"
    exit 1
}

# Image path
$imgPath = "C:\Users\kiets\.gemini\antigravity-ide\brain\317f7c45-5189-454c-b044-153c4634e666\scratch\page_3_img_0.png"
if (-not (Test-Path $imgPath)) {
    Write-Error "Image file not found: $imgPath"
    exit 1
}

function Await-WinRT ($asyncOp) {
    while ($asyncOp.Status -eq 'Started') {
        Start-Sleep -Milliseconds 10
    }
    return $asyncOp.GetResults()
}

function Get-TextFromOcr {
    param($path)
    
    $fileOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync($path)
    $file = Await-WinRT $fileOp
    
    $streamOp = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
    $stream = Await-WinRT $streamOp
    
    $decoderOp = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
    $decoder = Await-WinRT $decoderOp
    
    $bitmapOp = $decoder.GetSoftwareBitmapAsync()
    $softwareBitmap = Await-WinRT $bitmapOp
    
    $lang = [Windows.Globalization.Language]::new("en-US")
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
    if (-not $engine) {
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    }
    
    $ocrOp = $engine.RecognizeAsync($softwareBitmap)
    $ocrResult = Await-WinRT $ocrOp
    
    return $ocrResult.Text
}

try {
    $text = Get-TextFromOcr $imgPath
    Write-Output "--- OCR Result ---"
    Write-Output $text
    Write-Output "------------------"
} catch {
    Write-Error "OCR failed: $_"
}
