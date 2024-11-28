using System.Runtime.InteropServices.JavaScript;

// a main function is required
return;

public partial class RequestConverter
{
    [JSExport]
    internal static string Check(string input) {
        return "{\"return\":true}";
    }

    [JSExport]
    internal static string Convert(string input) {
        return "{\"return\":\"it works!\"}";
    }
}
