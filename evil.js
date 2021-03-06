"use strict";

require("./index.js");

// TODO: go the opposite route and delete everything that's not whitelisted?

// modules
delete global.require;
delete global.exports;
delete global.module;
delete global.root;

delete global.process;

delete global.__dirname;
delete global.__filename;

delete global.Buffer;

// constants NOTE: these are required by `request`
// delete global.DTRACE_NET_SERVER_CONNECTION;
// delete global.DTRACE_NET_STREAM_END;
// delete global.DTRACE_HTTP_SERVER_REQUEST;
// delete global.DTRACE_HTTP_SERVER_RESPONSE;
// delete global.DTRACE_HTTP_CLIENT_REQUEST;
// delete global.DTRACE_HTTP_CLIENT_RESPONSE;
delete global.GLOBAL;

// modules
delete global.assert;
delete global.async_hooks;
delete global.buffer;
delete global.child_process;
delete global.cluster;
// delete global.crypto;
delete global.dgram;
delete global.dns;
delete global.domain;
delete global.events;
delete global.fs;
delete global.http;
delete global.http2;
delete global.https;
delete global.inspector;
delete global.net;
delete global.os;
delete global.path;
delete global.perf_hooks;
delete global.punycode;
delete global.querystring;
delete global.readline;
delete global.repl;
delete global.stream;
delete global.string_decoder;
delete global.tls;
delete global.trace_events;
delete global.tty;
delete global.url;
delete global.util;
delete global.v8;
delete global.vm;
delete global.zlib;
