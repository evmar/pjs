// generated by pjs -- do not edit
function isSplice(sexp) {
  return sexp.length == 2 && pjs.isSym(sexp[0], ",@");
}

function qq(sexp) {
  switch (typeof(sexp)) {
    case "undefined":
      throw new Error("undefined sexp");
    case "string":
      return sexp;
    case "number":
      return sexp;
    default:
      if (pjs.isSym(sexp)) {
        return [pjs.sym("pjs.sym"), pjs.symStr(sexp)];
      } else {
        if (sexp.length == 2) {
          if (pjs.isSym(sexp[0], ",")) {
            return sexp[1];
          }
          if (pjs.isSym(sexp[0], ",@")) {
            throw new Error("no uqs here");
          }
        }
        var parts = [];
        var cur = null;
        for (var __pjs_1 = 0; __pjs_1 < sexp.length; ++__pjs_1) {
          var s = sexp[__pjs_1];
          if (isSplice(s)) {
            parts.push(s[1]);
            cur = null;
          } else {
            if (!cur) {
              cur = ([pjs.sym("list")]);
              parts.push(cur);
            }
            cur.push(qq(s));
          }
        }
        if (parts.length > 1) {
          parts.unshift(pjs.sym("list"));
          return [pjs.sym("[].concat.apply"), pjs.sym("[]"), parts];
        } else {
          return parts[0];
        }
      }
  }
}
exports.qq = qq;
