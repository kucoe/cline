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