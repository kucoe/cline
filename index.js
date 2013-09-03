/**
 * Cline
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
var EventEmitter = require('events').EventEmitter;
var _ = require('./util');


var Commands = function () {
    this.map = function (fn) {
        var res = [];
        _.forIn(commands, function (val, prop) {
            if (prop !== '*' && prop !== 'map') {
                var r = fn(prop, val);
                res.push(r);
                return r;
            }
            return true;
        });
        return res;
    };
};

var commands = new Commands();

var command = function (cmd, desc, args, fn) {
    this.cmd = cmd;
    if (_.isFunction(desc)) {
        fn = desc;
        desc = '';
        args = {};
    }
    this.desc = desc;
    this.args = args;
    this.listener = fn;
};

var defaultFn = function (val, fn) {
    if ('\\q' === val || 'exit' === val) {
        this.stream.close();
    } else if ('\\?' === val || 'help' === val) {
        this.usage();
    } else if ('\\c' === val || 'clear' === val) {
        this.stream.write(null, {ctrl: true, name: 'l'});
    }
    fn ? fn(val) : this.parse(val);
};

var nextTick = function (cli, str, mask, fn) {
    var next = cli._nextTick;
    var cb = function () {
        cli.prompt(str, mask, function (line) {
            fn(line);
            if (next) {
                cli._nextTick = next;
                next();
            }
        });
    };
    next ? cli._nextTick = cb : cb();
};

var completer = function (line) {
    var completions = commands.map(function (prop, val) {
        return val.cmd;
    });
    completions.unshift('help', 'clear', 'exit');
    var hits = completions.filter(function (c) {
        return c.indexOf(line) == 0
    });
    return [hits.length ? hits : completions, line]
};

var defaultStream = function () {
    var stream = require('readline').createInterface(process.stdin, process.stdout, completer, true);
    stream.print = function (msg) {
        console.log(msg);
    };
    var oldInsertString = stream._insertString;
    stream._insertString = function (c) {
        if (_.isDefined(self.mask)) {
            self._buf += c;
            oldInsertString.call(stream, self.mask);
        } else {
            oldInsertString.call(stream, c);
        }
    };
    return stream;
};

var Cli = function (stream) {
    var self = this;
    self.init(stream);
    EventEmitter.call(self);
};

require('util').inherits(Cli, EventEmitter);

Cli.prototype.init = function (stream) {
    if (this.stream) {
        this.stream.removeAllListeners('close');
        this.stream.removeAllListeners('line');
    }
    if (!stream) {
        stream = defaultStream();
    }
    this.stream = stream;
    var self = this;
    stream.once('close', function () {
        self.emit('close');
    });
    stream.on('line', function (line) {
        self.emit('history', line);
        if (self.fn) {
            self.fn(line);
        }
    });
};

Cli.prototype.usage = function () {
    var res = 'usage:';
    commands.map(function (prop, val) {
        res += '\n';
        res += val.cmd;
        res += val.desc ? ' - ' + val.desc : ' ';
    });
    res += '\nexit, \\q - close shell and exit';
    res += '\nhelp, \\? - print this usage';
    res += '\nclear, \\c - clear the terminal screen';
    this.stream.print(res);
    this.emit('usage');
    return res;
};

Cli.prototype.interactive = function (promptStr) {
    var self = this;
    self._nextTick = function () {
        self.prompt(promptStr, function (val) {
            self.parse(val);
            self._nextTick();
        });
    };
    self._nextTick();
};

Cli.prototype.prompt = function (str, mask, fn) {
    var stream = this.stream;
    var self = this;
    // default mask
    if (_.isFunction(mask)) {
        fn = mask;
        mask = null;
    }
    stream.setPrompt(str);
    self.mask = mask;
    if (_.isDefined(self.mask)) {
        self._buf = '';
    }
    this.fn = function (line) {
        if (self._buf) {
            line = self._buf;
            self._buf = '';
        }
        var val = line.trim();
        if (!val.length) {
            self.prompt(str, mask, fn);
        } else {
            defaultFn.call(self, val, fn);
        }
    };
    stream.prompt();
};

Cli.prototype.password = function (str, mask, fn) {
    if (_.isFunction(mask)) {
        fn = mask;
        mask = '';
    }
    var self = this;
    nextTick(this, str, mask, function (line) {
        fn ? fn(line) : self.parse(line);
    });
};

Cli.prototype.confirm = function (str, fn) {
    var self = this;
    nextTick(this, str, null, function (line) {
        fn ? fn(/^y|yes|ok|true$/i.test(line)) : self.parse(line);
    });
};

Cli.prototype.command = function (cmd, desc, args, fn) {
    if (_.isFunction(args)) {
        fn = args;
        args = {};
    }
    var p = cmd;
    _.forIn(args, function (val, prop) {
        var regex = new RegExp('{' + prop + '}', 'g');
        if (regex.test(p)) {
            p = p.replace(regex, '(' + val + ')');
        }
    });
    commands[p] = new command(cmd, desc, args, fn);
};

Cli.prototype.parse = function (str) {
    var resp = null;
    var self = this;
    commands.map(function (prop, val) {
        var regex = new RegExp(prop);
        if (str.match(regex)) {
            var matches = regex.exec(str);
            var main = matches.shift();
            var args = {};
            _.forIn(val.args, function (val, prop) {
                var s = matches.shift();
                s = _.convert(s);
                args[prop] = s;
            });
            var fn = val.listener;
            resp = (fn ? fn(main, args) : true) || true;
            self.emit('command', main, val.cmd);
            return false;
        }
        return true;
    });
    if (!resp && commands['*']) {
        resp = commands['*'].listener(str);
    }
    return resp;
};

Cli.prototype.history = function (items) {
    if (_.isDefined(items)) {
        this.stream.history = items.reverse();
        this.stream.historyIndex = -1;

    }
    return this.stream.history;
};

module.exports = function (stream, tests) {
    var cli = new Cli(stream);
    if (tests) {
        cli.commands = commands;
        cli.clean = function () {
            commands = new Commands();
        };
    }
    return cli;
};



