// generated by pjs -- do not edit
function isSplice(sexp) {
  return sexp.length == 2 && pjs.isSymbol(sexp[0], "uqs");
};

function qq(sexp) {
  switch (typeof(sexp)) {
    case "undefined":
      throw new Error("undefined sexp");
    case "string":
      return sexp;
    case "number":
      return sexp;
    default:
      if (pjs.isSymbol(sexp)) {
        return [pjs.sym("pjs.sym"), sexp.sym()];
      } else {
        if (sexp.length == 2) {
          if (pjs.isSymbol(sexp[0], "uq")) {
            return sexp[1];
          }
          if (pjs.isSymbol(sexp[0], "uqs")) {
            throw new Error("no uqs here");
          }
        }
        var parts = [pjs.sym("list")];
        var cur = null;
        var didSplice = false;
        sexp.forEach(function(s) {
          if (isSplice(s)) {
            didSplice = true;
            parts.push(s[1]);
            cur = null;
          } else {
            if (!cur) {
              cur = [pjs.sym("list")];
              parts.push(cur);
            }
            cur.push(qq.call(cur, s));
          }
        });
        if (didSplice) {
          return [pjs.sym("[].concat.apply"), [pjs.sym("list")], parts];
        } else {
          return cur;
        }
      }
  }
};
exports.qq = qq;