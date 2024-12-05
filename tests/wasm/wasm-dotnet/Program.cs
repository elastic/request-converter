using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;

// a main function is required
return;

public class ParsedRequest
{
    public string? api {get; set;}
    public Dictionary<string, string>? body;
    public string method;
    public Dictionary<string, object?> params1;
    public string path;
    public Dictionary<string, string>? query;
    public string? raw_path;
    public string source;
    public string url;
}

public class ConvertOptions
{
    public bool? check_only {get; set;}
    public bool? complete;
    public bool? print_response;
    public string? elasticsearch_url;
    public bool? debug;
}

public class Input
{
    public List<ParsedRequest>? requests {get; set;}
    public ConvertOptions? options {get; set;}
}

[JsonSerializable(typeof(Input))]
[JsonSerializable(typeof(ParsedRequest))]
[JsonSerializable(typeof(ConvertOptions))]
[JsonSerializable(typeof(bool))]
[JsonSerializable(typeof(int))]
[JsonSerializable(typeof(string))]
public partial class InputContext : JsonSerializerContext
{
}

public partial class RequestConverter
{
    [JSExport]
    internal static string Check(string input) {
        Input parsedInput = JsonSerializer.Deserialize<Input>(input, InputContext.Default.Input);
        return "{\"return\":true}";
    }

    [JSExport]
    internal static string Convert(string input) {
        Input parsedInput = JsonSerializer.Deserialize<Input>(input, InputContext.Default.Input);
        var result = String.Join(",", parsedInput.requests.ConvertAll<string>(req => req.api));
        return $"{{\"return\":\"{result}\"}}";
    }
}
