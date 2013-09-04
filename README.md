cline
=====

Command-line apps building library for Node.

Based on readline Node module (http://nodejs.org/api/readline.html) and includes history, completions, prompt
and regex commands support.

## Installation

    $ npm install cline

## Usage

```js
    require('cline')();
```

  If you need to provide your own command line interface,
  you can pass it as parameter (visit https://github.com/kucoe/cline/blob/master/tests.js for mock example).

```js
    var cli = require('cline')(mock);
```

  Passing second parameter allows to get direct commands access and clean function (for test purposes)

```js
    var cli = require('cline')(mock, true);
```

### Methods



### System commands

    clear or \c - clears the terminal screen

    help or \? - shows help with all commands listed

    exit or \q  - close shell and exit

### Events

    close - fires when interface is closed

    command - fires when command is matched (except system commands and '*' wildcard command),
              passes user input and matched command as listener arguments

    history - fires when history item was added,
              passes history item as listener argument

    usage - fires when usage was requested,
            passes printed help as listener argument


## Example

```js
    var cli = require('cline')();

    cli.command('start', 'starts program', function () {
        cli.password('Password:', function (str) {
            console.log(str);
        })
    });
    cli.command('stop', function () {
        cli.confirm('Sure?', function (ok) {
            if (ok) {
                console.log('done');
            }
        })
    });

    cli.command('{string}', '', {string: '[A-Za-z]+'});
    cli.command('{number}', '', {number: '\\d+'});

    cli.on('command', function (input, cmd) {
        if ('start' !== cmd && 'stop' != cmd) {
            cli.prompt('More details on ' + cmd + ':');
        }
    });

    cli.history(['start', 'stop']);
    cli.interact('>');

    cli.on('history', function (item) {
        console.log('New history item ' + item);
    });

    cli.on('close', function () {
        console.log('History:' + cli.history());
        process.exit();
    });
```


## License

(The MIT License)

Copyright (c) 2013 Wolf Bas &lt;becevka@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
