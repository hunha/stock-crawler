const https = require('https');

const get = (options) => {
    return new Promise((resolve, reject) => {
        https.get(options, res => {
            var result = '';

            res.on('data', chunk => { result += chunk });

            res.on('end', () => {
                if (options.json) {
                    resolve(JSON.parse(result));
                } else {
                    resolve(result);
                }
            })

            res.on('error', function (err) {
                reject(err);
            })
        });
    });
}

const post = (options, formData) => {
    return new Promise((resolve, reject) => {
        var postData = JSON.stringify(formData);

        options.method = 'POST';
        options.headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        };

        var req = https.request(options, function (res) {
            var result = '';

            res.on('data', chunk => { result += chunk });

            res.on('end', function () {
                resolve(result);
            });

            res.on('error', function (err) {
                reject(err);
            })
        });

        req.on('error', function (err) {
            reject(err);
        });

        req.write(postData);
        req.end();
    });
}

module.exports = {
    get,
    post
}