// import * as benchpress from 'benchpressjs';
import '/benchpress.js';

benchpress.registerLoader(function (template, callback) {
    $.ajax({
        url: `/templates/${template}.jst`,
        cache: false,
        dataType: 'text',
        success: function (script) {
            const renderFunction = new Function('module', script);
            const moduleObj = { exports: {} };
            renderFunction(moduleObj);
            callback(moduleObj.exports);
        },
    }).fail(function () {
        console.error('Unable to load template: ' + template);
        callback(new Error('[[error:unable-to-load-template]]'));
    });    
});

// render template client side, file is loaded from /dist/templates/testing.jst
benchpress.render('testing', { name: 'john done' }).then((output) => {
    console.log(output);
    $('#renderOutput').html(output);
});
