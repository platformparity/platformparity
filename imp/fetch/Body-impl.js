"use strict";

const Blob = require("../../lib/Blob.js");
const FormData = require("../../lib/FormData.js");

const { Buffer } = require("buffer");
const Stream = require("stream");
const { PassThrough } = Stream;

const { URLSearchParams } = require("url");
const {
  ReadableStream,
  readableStreamFromNode
} = require("@platformparity/streams");

const convert = require("encoding").convert;

// TODO: don't bother with the symbol, since impl class isn't exposed anyway
const INTERNALS = Symbol("Body internals");

class BodyImpl {
  get body() {
    return this[INTERNALS].body;
  }

  get bodyUsed() {
    return this[INTERNALS].body._disturbed;
  }

  arrayBuffer() {
    return this.consumeBody().then(buf =>
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    );
  }

  blob() {
    return this.consumeBody().then(buf =>
      Blob.create([[buf], { type: this.mimeType }])
    );
  }

  formData() {
    throw new Error("not implemented");
  }

  json() {
    return this.consumeBody().then(buffer => {
      return JSON.parse(buffer.toString());
    });
  }

  text() {
    return this.consumeBody().then(buffer => buffer.toString());
  }

  // PRIVATE METHODS
  // ---------------

  initBody(input, headers) {
    const { content, mimeType, totalBytes } = this.extractContent(input);

    // meh...
    this[INTERNALS] = {
      source: null,
      body: null,
      mimeType,
      totalBytes,
      transmittedBytes: 0 // FIXME: not actually being used
    };

    if (mimeType !== null && !headers.has("Content-Type")) {
      headers.append("Content-Type", mimeType); // FIXME: why append?
    }

    if (content != null) {
      if (content instanceof ReadableStream) {
        // TODO: If keepalive flag is set and object’s type is a ReadableStream object,
        // then throw a TypeError.
        this[INTERNALS].body = content;
      } else {
        const stream = new PassThrough();
        stream.end(content);
        const body = readableStreamFromNode(stream);
        Object.assign(this[INTERNALS], { body, source: input });
      }
    }

    /*
    this.nodeMaxChunkSize = nodeMaxChunkSize;
    this.nodeTimeout = nodeTimeout;

    if (body instanceof Stream) {
      // handle stream error, such as incorrect content-encoding
      body.on("error", err => {
        let error;
        if (err instanceof Error) {
          error = err;
        } else {
          error = new Error(
            `Invalid response body while trying to fetch ${this.url}: ${
              err.message
            }`,
            "system",
            err
          );
        }
        const { rejectCurrentPromise } = this[INTERNALS];
        if (typeof rejectCurrentPromise === "function") {
          rejectCurrentPromise(error);
        } else {
          this[INTERNALS].error = error;
        }
      });
    }
    */
  }

  // https://fetch.spec.whatwg.org/#concept-body-consume-body
  consumeBody() {
    // FIXME: same error as browser impls?
    if (this.body.locked) {
      return Promise.reject(new TypeError("body stream locked"));
    } else if (this.body._disturbed) {
      return Promise.reject(new TypeError("body stream already read"));
    }

    const stream = this.body || new ReadableStream();

    let reader;
    try {
      reader = stream.getReader();
    } catch (e) {
      return Promise.reject(e);
    }

    return this.readAllBytes(reader);
  }

  // https://fetch.spec.whatwg.org/#concept-read-all-bytes-from-readablestream
  async readAllBytes(reader) {
    const bytes = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done === false && value instanceof Uint8Array) {
        bytes.push(value);
      } else if (done === true) {
        return Buffer.concat(bytes);
      } else {
        throw new TypeError("not done and value not type of Uint8Array");
      }
    }
  }

  /*
  async readAllBytes(reader) {
    const bytes = [];
    // FIXME: reader doesn't implement async iterable ?
    for await (const chunk of reader) {
      if (chunk instanceof Uint8Array) bytes.push(chunk);
      else throw new TypeError("chunk not type of Uint8Array");
    }
    return Buffer.concat(bytes);
  }
  */

  /*
  readAllBytes(reader) {
    const bytes = [];

    return pump();

    function pump() {
      return reader.read().then(({ value, done }) => {
        if (done === false && value instanceof Uint8Array) {
          bytes.push(value);
          return pump(); // FIXME: maximum call stack size?
        } else if (done === true) {
          return Buffer.concat(bytes);
        } else {
          return Promise.reject(
            new TypeError("not done and value not type of Uint8Array")
          );
        }
      });
    }
  }
  */

  extractContent(input) {
    if (input == null) {
      return {
        content: null,
        mimeType: null,
        totalBytes: 0
      };
    }

    if (Blob.isImpl(input)) {
      return {
        content: input._buffer,
        mimeType: input.type,
        totalBytes: input.size
      };
    }

    if (input instanceof ArrayBuffer) {
      return {
        content: Buffer.from(input),
        mimeType: null,
        totalBytes: input.byteLength
      };
    }

    if (ArrayBuffer.isView(input)) {
      return {
        content: Buffer.from(input, input.byteOffset, input.byteLength),
        mimeType: null,
        totalBytes: input.byteLength
      };
    }

    if (FormData.isImpl(input)) {
      // ("multipart/form-data; boundary=----TODO");
      throw Error("not implemented");
    }

    if (input instanceof URLSearchParams) {
      const buffer = Buffer.from(String(body));
      return {
        content: buffer,
        mimeType: "application/x-www-form-urlencoded;charset=UTF-8",
        totalBytes: buffer.byteLength
      };
    }

    if (input instanceof ReadableStream) {
      return {
        content: input,
        mimeType: null,
        totalBytes: null
      };
    }

    if (typeof input === "string") {
      const buffer = Buffer.from(input);
      return {
        content: buffer,
        mimeType: "text/plain;charset=UTF-8",
        totalBytes: buffer.byteLength
      };
    }

    throw Error("Unrecognized type", input);

    // NOTE: Sorry, we're not dealing with node streams anymore.
    // // istanbul ignore if: should never happen
    // if (!(input instanceof Stream)) {
    //   return Buffer.alloc(0);
    // }
    //
    // // source is stream
    // // get ready to actually consume the body
    // let accum = [];
    // let accumBytes = 0;
    // let abort = false;
    //
    // return new Promise((resolve, reject) => {
    //   let resTimeout;
    //
    //   // allow timeout on slow response body
    //   if (this.nodeTimeout) {
    //     resTimeout = setTimeout(() => {
    //       abort = true;
    //       reject(
    //         new Error(
    //           `Response timeout while trying to fetch ${this.url} (over ${
    //             this.nodeTimeout
    //           }ms)`,
    //           "body-timeout"
    //         )
    //       );
    //     }, this.nodeTimeout);
    //   }
    //
    //   this[INTERNALS].rejectCurrentPromise = reject;
    //
    //   input.on("data", chunk => {
    //     if (abort || chunk === null) {
    //       return;
    //     }
    //
    //     if (
    //       this.nodeMaxChunkSize &&
    //       accumBytes + chunk.length > this.nodeMaxChunkSize
    //     ) {
    //       abort = true;
    //       reject(
    //         new Error(
    //           `content size at ${this.url} over limit: ${
    //             this.nodeMaxChunkSize
    //           }`,
    //           "max-size"
    //         )
    //       );
    //       return;
    //     }
    //
    //     accumBytes += chunk.length;
    //     accum.push(chunk);
    //   });
    //
    //   input.once("end", () => {
    //     if (abort) {
    //       return;
    //     }
    //
    //     clearTimeout(resTimeout);
    //
    //     try {
    //       resolve(Buffer.concat(accum));
    //     } catch (err) {
    //       // handle streams that have accumulated too much data (issue #414)
    //       reject(
    //         new Error(
    //           `Could not create Buffer from response body for ${this.url}: ${
    //             err.message
    //           }`,
    //           "system",
    //           err
    //         )
    //       );
    //     }
    //   });
    // });
  }

  // TODO: this doesn't belong here
  // http://www.w3.org/TR/2011/WD-html5-20110113/parsing.html#determining-the-character-encoding
  detectBufferEncoding(buffer) {
    const ct = this.headers.get("content-type");
    let charset = "utf-8";
    let res, str;

    // header
    if (ct) {
      res = /charset=([^;]*)/i.exec(ct);
    }

    // no charset in content type, peek at response body for at most 1024 bytes
    str = buffer.slice(0, 1024).toString();

    // html5
    if (!res && str) {
      res = /<meta.+?charset=(['"])(.+?)\1/i.exec(str);
    }

    // html4
    if (!res && str) {
      res = /<meta[\s]+?http-equiv=(['"])content-type\1[\s]+?content=(['"])(.+?)\2/i.exec(
        str
      );

      if (res) {
        res = /charset=(.*)/i.exec(res.pop());
      }
    }

    // xml
    if (!res && str) {
      res = /<\?xml.+?encoding=(['"])(.+?)\1/i.exec(str);
    }

    // found charset
    if (res) {
      charset = res.pop();

      // prevent decode issues when sites use incorrect encoding
      // ref: https://hsivonen.fi/encoding-menu/
      if (charset === "gb2312" || charset === "gbk") {
        charset = "gb18030";
      }
    }

    return charset;
  }

  // TODO: does this belong here?
  convertBody(buffer) {
    const charset = this.detectBufferEncoding(buffer);
    // turn raw buffers into a single utf-8 buffer
    return convert(buffer, "UTF-8", charset).toString();
  }

  cloneBodyTo(that) {
    that[INTERNALS] = {};

    for (const prop in this[INTERNALS]) {
      that[INTERNALS][prop] = this[INTERNALS][prop];
    }

    if (this.body != null) {
      try {
        const [out1, out2] = this.body.tee();

        this[INTERNALS].body = out1;
        that[INTERNALS].body = out2;
      } catch (e) {
        throw new TypeError("cannot clone body after it is used");
      }
    }
  }

  get mimeType() {
    return this[INTERNALS].mimeType;
  }

  get totalBytes() {
    return this[INTERNALS].totalBytes;
  }

  get transmittedBytes() {
    return this[INTERNALS].transmittedBytes;
  }
}

exports.implementation = BodyImpl;
