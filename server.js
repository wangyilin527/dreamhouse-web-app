var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
var app = express();
app.use(express.static('www'));
app.use(express.static(path.join('www', 'build')));
app.use(bodyParser.json());
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/dreamhouse';

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

if (process.env.DATABASE_URL !== undefined) {
    pg.defaults.ssl = true;
}

var client = new pg.Client(connectionString);
client.connect();

var propertyTable = 'property__c';
var favoriteTable = 'favorite__c';
var brokerTable = 'broker__c';
var contactTable = 'contact';
var activityTable = 'appactivity__c';

// setup the demo data if needed
client.query('SELECT * FROM salesforce.broker__c', function (error, data) {
    if (error !== null) {
        client.query('SELECT * FROM broker__c', function (error, data) {
            if (error !== null) {
                console.log('Loading Demo Data...');
                require('./db/demo.js')(client);
                console.log('Done Loading Demo Data!');
            }
        });
    }
    else {
        var schema = 'salesforce.';
        propertyTable = schema + 'property__c';
        favoriteTable = schema + 'favorite__c';
        brokerTable = schema + 'broker__c';
        contactTable = schema + 'contact';
        activityTable = schema + 'appactivity__c';
    }
});


app.get('/property', function (req, res) {
    client.query('SELECT * FROM ' + propertyTable, function (error, data) {
        res.json(data.rows);
    });
});

app.get('/property/:id', function (req, res) {
    client.query('SELECT ' + propertyTable + '.*, ' + brokerTable + '.sfid AS broker__c_sfid, ' + brokerTable + '.name AS broker__c_name, ' + brokerTable + '.email__c AS broker__c_email__c, ' + brokerTable + '.phone__c AS broker__c_phone__c, ' + brokerTable + '.mobile_phone__c AS broker__c_mobile_phone__c, ' + brokerTable + '.title__c AS broker__c_title__c, ' + brokerTable + '.picture__c AS broker__c_picture__c FROM ' + propertyTable + ' INNER JOIN ' + brokerTable + ' ON ' + propertyTable + '.broker__c = ' + brokerTable + '.sfid WHERE ' + propertyTable + '.sfid = $1', [req.params.id], function (error, data) {
        res.json(data.rows[0]);
    });
});

app.get('/favorite', function (req, res) {
    var query = 'SELECT ' + propertyTable + '.*, ' + favoriteTable + '.sfid AS favorite__c_sfid FROM ' + propertyTable + ', ' + favoriteTable + ' WHERE ' + propertyTable + '.sfid = ' + favoriteTable + '.property__c AND ' + favoriteTable + '.contact__c = $1 ORDER BY ' + favoriteTable + '.createddate DESC LIMIT 10';
    client.query(query, [req.query.contactid], function (error, data) {
        res.json(data.rows);
    });
});

app.post('/favorite', function (req, res) {
    var query = 'INSERT INTO ' + favoriteTable + ' (property__c, contact__c, external_id__c) VALUES ($1, $2, $3)';
    client.query(query, [req.body.property__c, req.body.contact__c, guid()], function (error, data) {
        res.json(data);
    });
});

app.delete('/favorite/:sfid', function (req, res) {
    client.query('DELETE FROM ' + favoriteTable + ' WHERE sfid = $1', [req.params.sfid], function (error, data) {
        res.json(data);
    });
});

app.get('/broker', function (req, res) {
    client.query('SELECT * FROM ' + brokerTable, function (error, data) {
        res.json(data.rows);
    });
});

app.get('/broker/:sfid', function (req, res) {
    client.query('SELECT * FROM ' + brokerTable + ' WHERE sfid = $1', [req.params.sfid], function (error, data) {
        res.json(data.rows[0]);
    });
});

app.get('/contact', function (req, res) {
    client.query('SELECT sfid, Email FROM ' + contactTable + ' WHERE email = $1', [req.query.email], function (error, data) {
        res.json(data.rows[0]);
    });
});

app.post('/activity', function (req, res) {
    var query = 'INSERT INTO ' + activityTable + ' (name, broker__c, contact__c, property__c, external_id__c) VALUES ($1, $2, $3, $4, $5)';
    client.query(query, [req.body.name, req.body.broker__c, req.body.contact__c, req.body.property__c, guid()], function (error, data) {
        res.json(data);
    });
});

var port = process.env.PORT || 8200;

app.listen(port);

console.log('Listening at: http://localhost:' + port);