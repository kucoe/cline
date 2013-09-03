module.exports.isUndefined = function (value) {
    return value == undefined;
};

module.exports.isDefined = function (value) {
    return value != undefined;
};

module.exports.isFunction = function (value) {
    return typeof value == 'function';
};

module.exports.isString = function (value) {
    return typeof value == 'string';
};


//string to type
module.exports.convert = function (string, context) {
    var res = string;
    var reviver = function (k, v) {
        if (module.exports.isString(v) && v[0] == '#') {
            return context[v.substring(1)];
        }
        return v;
    };
    if ('true' === string) {
        res = true
    } else if ('false' === string) {
        res = false
    } else if (/^\d*$/.test(string)) {
        if (string.indexOf('.') != -1) {
            res = parseFloat(string);
        } else {
            res = parseInt(string, 10);
        }
    } else if (string[0] == '[' && string[string.length - 1] == "]") {
        string = string.replace(/'/g, '"');
        res = JSON.parse(string, reviver);
    } else if (string[0] == '{' && string[string.length - 1] == "}") {
        string = string.replace(/'/g, '"');
        res = JSON.parse(string, reviver);
    } else if (string[0] == '"' || string[0] == "'") {
        res = string.substring(1, string.length - 1);
    }
    return res;
};


module.exports.forIn = function (object, callback, thisArg, all) {
    if (!thisArg) {
        thisArg = this;
    }
    if (callback) {
        for (var prop in object) {
            if (object.hasOwnProperty(prop) || all) {
                if (callback.call(thisArg, object[prop], prop, object) === false) {
                    break;
                }
            }
        }
    }
    return object;
};


