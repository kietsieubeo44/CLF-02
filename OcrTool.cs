using System;
using System.IO;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage;
using Windows.Storage.Streams;

class Program
{
    static void Main(string[] args)
    {
        if (args.Length < 1)
        {
            Console.WriteLine("Usage: OcrTool <image_path>");
            return;
        }

        string imagePath = Path.GetFullPath(args[0]);
        if (!File.Exists(imagePath))
        {
            Console.WriteLine("File not found: " + imagePath);
            return;
        }

        try
        {
            var fileOp = StorageFile.GetFileFromPathAsync(imagePath);
            var file = System.WindowsRuntimeSystemExtensions.AsTask(fileOp).Result;

            var streamOp = file.OpenAsync(FileAccessMode.Read);
            using (var stream = System.WindowsRuntimeSystemExtensions.AsTask(streamOp).Result)
            {
                var decoderOp = BitmapDecoder.CreateAsync(stream);
                var decoder = System.WindowsRuntimeSystemExtensions.AsTask(decoderOp).Result;

                var bitmapOp = decoder.GetSoftwareBitmapAsync();
                var softwareBitmap = System.WindowsRuntimeSystemExtensions.AsTask(bitmapOp).Result;

                var lang = new Windows.Globalization.Language("en-US");
                OcrEngine engine = OcrEngine.TryCreateFromLanguage(lang);
                if (engine == null)
                {
                    engine = OcrEngine.TryCreateFromUserProfileLanguages();
                }

                var ocrOp = engine.RecognizeAsync(softwareBitmap);
                var result = System.WindowsRuntimeSystemExtensions.AsTask(ocrOp).Result;

                Console.OutputEncoding = System.Text.Encoding.UTF8;
                Console.WriteLine(result.Text);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Error during OCR: " + ex.Message);
            if (ex.InnerException != null)
            {
                Console.Error.WriteLine("Inner error: " + ex.InnerException.Message);
            }
            Console.Error.WriteLine(ex.StackTrace);
        }
    }
}
