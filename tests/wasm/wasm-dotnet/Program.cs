using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text;
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

internal readonly record struct SuccessResponse<T>
{
    public required T? Return { get; init; }
}

internal readonly record struct ErrorResponse
{
    public required string? Error { get; init; }
}

[JsonSerializable(typeof(Input))]
[JsonSerializable(typeof(SuccessResponse<bool>))]
[JsonSerializable(typeof(SuccessResponse<string>))]
[JsonSerializable(typeof(ErrorResponse))]
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
            return ErrorResponse($"Internal Error:\n {e}");
        }
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private static string SuccessResponse<T>(T result)
    {
        return Serialize(new SuccessResponse<T> { Return = result });
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private static string ErrorResponse(string error)
    {
        return Serialize(new ErrorResponse { Error = error });
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private static string Serialize<T>(T input)
    {
#pragma warning disable IL2026, IL3050 // False positive
        var payload = JsonSerializer.SerializeToUtf8Bytes(input, SerializerOptions);
#pragma warning restore IL2026, IL3050

        return Base64UrlEncode(payload);
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private static T? Deserialize<T>(string input)
    {
        var payload = Base64UrlDecode(input);

#pragma warning disable IL2026, IL3050 // False positive
        return JsonSerializer.Deserialize<T>(payload, SerializerOptions);
#pragma warning restore IL2026, IL3050
    }

    private static string Base64UrlEncode(byte[] value)
    {
        var s = System.Convert.ToBase64String(value);

        s = s.Split('=')[0];
        s = s.Replace('+', '-');
        s = s.Replace('/', '_');

        return s;
    }

    private static byte[] Base64UrlDecode(string value)
    {
        var s = value;

        s = s.Replace('-', '+');
        s = s.Replace('_', '/');
        s = (s.Length % 4) switch
        {
            0 => s,
            2 => s + "==",
            3 => s + "=",
            _ => throw new DataException("Illegal base64 url string.")
        };

        return System.Convert.FromBase64String(s);
    }
}
