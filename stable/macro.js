// generated by pjs -- do not edit
function fn(args, expr) {
  return [pjs.sym("function"), args, [pjs.sym("return"), expr]];
}
exports.fn = fn;

function caseSexp(sexp) {
  var cases = Array.prototype.slice.call(arguments, 1);
  return [pjs.sym("switch"), [pjs.sym("typeof"), sexp],
    ["undefined", [pjs.sym("throw"), [pjs.sym("new"), pjs.sym("Error"), "undefined sexp"]]],
    ["string", pjs.assoc(cases, pjs.sym("string"))],
    ["number", pjs.assoc(cases, pjs.sym("number"))],
    [pjs.sym("default"), [pjs.sym("if"), [pjs.sym("pjs.isSym"), sexp], pjs.assoc(cases, pjs.sym("symbol")), pjs.assoc(cases, pjs.sym("sexp"))]]
  ];
}
exports.caseSexp = caseSexp;

function forEach(name, list) {
  var body = Array.prototype.slice.call(arguments, 2);
  var i = pjs.sym("__pjs_1");
  return [].concat.apply([], [
    [pjs.sym("for"), [pjs.sym("var"), i, 0],
      [pjs.sym("<"), i, [pjs.sym("."), list, pjs.sym("length")]],
      [pjs.sym("++"), i],
      [pjs.sym("var"), name, [pjs.sym("at"), list, i]]
    ], body
  ]);
}
exports.forEach = forEach;

function assert(exp, message) {
  return [pjs.sym("if"), [pjs.sym("!"), exp],
    [pjs.sym("throw"), [pjs.sym("new"), pjs.sym("Error"), message]]
  ];
}
exports.assert = assert;

function map(f, list) {
  return [
    [pjs.sym("."), list, pjs.sym("map")], f
  ];
}
exports.map = map;
