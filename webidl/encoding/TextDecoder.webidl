dictionary TextDecoderOptions {
  boolean fatal = false;
  boolean ignoreBOM = false;
};

dictionary TextDecodeOptions {
  boolean stream = false;
};

[Constructor(optional DOMString label = "utf-8", optional TextDecoderOptions options),
 Exposed=(Window,Worker)]
interface TextDecoder {
  readonly attribute DOMString encoding;
  readonly attribute boolean fatal;
  readonly attribute boolean ignoreBOM;
  USVString decode(optional BufferSource input, optional TextDecodeOptions options);
};
