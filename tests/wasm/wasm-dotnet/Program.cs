using System.Runtime.CompilerServices;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text.Json;
using System.Text.Json.Serialization;

// A main function is required.
return;

internal sealed record ParsedRequest
{
    public string? Api { get; init; }
    public JsonElement? Body { get; init; }
    public required string Method { get; init; }
    public IReadOnlyDictionary<string, JsonElement>? Params { get; init; }
    public required string Path { get; init; }
    public IReadOnlyDictionary<string, JsonElement>? Query { get; init; }
    public string? RawPath { get; init; }
    public required string Source { get; init; }
    public required string Url { get; init; }
}

internal sealed record ConvertOptions
{
    public bool? CheckOnly { get; init; }
    public bool? Complete { get; init; }
    public bool? PrintResponse { get; init; }
    public string? ElasticsearchUrl { get; init; }
    public bool? Debug { get; init; }
}

internal sealed record Input
{
    public IReadOnlyList<ParsedRequest>? Requests { get; init; }
    public ConvertOptions? Options { get; init; }
}

[JsonSerializable(typeof(Input))]
internal partial class SerializerContext : JsonSerializerContext;

[SupportedOSPlatform("browser")]
internal static partial class RequestConverter
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        TypeInfoResolver = SerializerContext.Default,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    [JSExport]
    internal static string Check(string input)
    {
        return Execute(() =>
        {
            var parsedInput = Deserialize<Input>(input);
            if (parsedInput is null)
            {
                return ErrorResponse("Failed to deserialize input.");
            }

            return SuccessResponse(true);
        });
    }

    [JSExport]
    internal static string Convert(string input)
    {
        return Execute(() =>
        {
            var parsedInput = Deserialize<Input>(input);
            if (parsedInput is null)
            {
                return ErrorResponse("Failed to deserialize input.");
            }

            var result = string.Join(",", parsedInput.Requests?.Select(req => req.Api) ?? []);

            return SuccessResponse(result);
        });
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private static string Execute(Func<string> action)
    {
        try
        {
            return action();
        }
        catch (Exception e)
        {
            return ErrorResponse($"Internal Error: {e.Message}");
        }
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private static string SuccessResponse<T>(T result)
    {
        return Serialize(new { Return = result });
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private static string ErrorResponse<T>(T error)
    {
        return Serialize(new { Error = error });
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private static string Serialize<T>(T input)
    {
#pragma warning disable IL2026 // False positive
        return JsonSerializer.Serialize(input, SerializerOptions);
#pragma warning restore IL2026
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private static T? Deserialize<T>(string input)
    {
#pragma warning disable IL2026 // False positive
        return JsonSerializer.Deserialize<T>(input, SerializerOptions);
#pragma warning restore IL2026
    }
}
