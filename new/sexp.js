// generated by pjs -- do not edit
var sym = require("./symbol.js").sym;

function isAtomChar(char) {
  var re = new RegExp("[a-zA-Z_.\\[\\]0-9&!=|+<>#{}*-]");
  return re.test(char);
};

function isNumber(atom) {
  var re = new RegExp("^\\d+$");
  return re.test(atom);
};

function Reader(str) {
  this.str = str;
  this.ofs = 0;
};
Reader.prototype.read = function() {
  while (this.ofs < this.str.length) {
    var c = this.str[this.ofs];
    ++this.ofs;
    switch (c) {
      case " ":
        continue;
      case "\n":
        continue;
      case ";":
        for (; this.ofs < this.str.length; ++this.ofs) {
          if (this.str[this.ofs] == "\n") {
            break;
          }
        }
        continue;
      case "(":
        var sexp = [];
        for (var s;
          (s = this.read()) != null;) {
          sexp.push(s);
        }
        if (this.str[this.ofs] != ")") {
          throw "expected rparen";
        }
        ++this.ofs;
        return sexp;
      case ")":
        --this.ofs;
        return null;
      case "\x22":
        var str = "";
        for (; this.ofs < this.str.length; ++this.ofs) {
          var c = this.str[this.ofs];
          if (c == "\x22") {
            break;
          }
          str += c;
        }
        if (this.str[this.ofs] != "\x22") {
          throw "expected rparen";
        }
        ++this.ofs;
        return str;
      case "`":
        return [sym("qq"), this.read()];
      case ",":
        if (this.str[this.ofs] == "@") {
          ++this.ofs;
          return [sym("uqs"), this.read()];
        }
        return [sym("uq"), this.read()];
      case ":":
        var symbol = this.read();
        return [sym("pjs.sym"), symbol.sym()];
      default:
        if (!isAtomChar(c)) {
          throw "bad char " + c + " at offset " + this.ofs;
        }
        var atom = c;
        for (; this.ofs < this.str.length; ++this.ofs) {
          var c = this.str[this.ofs];
          if (!isAtomChar(c)) {
            break;
          }
          atom += c;
        }
        if (isNumber(atom)) {
          return parseInt(atom);
        } else {
          return sym(atom);
        }
    }
    throw "shouldn't be reached";
  }
  return null;
};

function parse(data) {
  var r = new Reader("(" + data.toString() + ")");
  return r.read();
};
exports.parse = parse;
exports.Reader = Reader;