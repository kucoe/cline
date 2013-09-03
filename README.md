cline
=====

Command-line apps building library for Node.

Based on readline Node module (http://nodejs.org/api/readline.html) and includes history, completions, prompt
and regex commands support.

## Installation

    $ npm install cline

## Usage

    require('cline')();

  If you need to provide your own command line interface, you can pass it as parameter (visit test.js for mock example).

    var cli = require('cline')(mock);

  Passing second parameter allows to get direct commands access and clean function (for test purposes)

    var cli = require('cline')(mock, true);


## Example

    var cli = require('./index')();

    cli.command('start', 'starts program', {}, function () {
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

    cli.history(['start', 'stop']);
    cli.interactive('>');

    cli.on('history', function (item) {
        console.log('New history item ' + item);
    });

    cli.on('close', function () {
        console.log(cli.history());
        process.exit();
    });



