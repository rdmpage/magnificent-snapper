var request = require('request');

var ReconcilationAPI = require('./reconcile.js');

var reconcile = new ReconcilationAPI();

var CSL = require('./csl.js');

// Load the Cloudant library.
var Cloudant = require('cloudant');

var username = process.env.cloudant_username; // Set this to your own account
var password = process.env.cloudant_password;

// Initialize the library with my account.
var cloudant = Cloudant({account:username, password:password});

//
// This defines three routes that our API is going to use.
//

var routes = function(app) {


  
  //--------------------------------------------------------------------------------------
  // handle a GET request to reconcile
  app.get("/reconcile", function(req, res) {

    //console.log("Received GET: "+JSON.stringify(req.body));

    var callback_parameter = '';
    if (req.query.callback) {
      callback_parameter = req.query.callback;
    }

    if (req.query.queries) {
      //var result = reconcile.Query(JSON.parse(req.query.queries), res);
      reconcile.reconcile(JSON.parse(req.query.queries), res, callback_parameter);
      //return res.send(result);
    } else {
      var metadata = reconcile.metadata(callback_parameter);

      if (callback_parameter != '') {
        metadata = callback_parameter + '(' + JSON.stringify(metadata) + ')';
      } else {
        metadata = JSON.stringify(metadata);
      }
      return res.send(metadata);
    }

  });

  //--------------------------------------------------------------------------------------
  // handle a POST request to reconcile
  app.post("/reconcile", function(req, res) {

    console.log("Received POST: " + JSON.stringify(req.body));

    if (1) {

      var q = req.body;

      if (q.queries) {
        q = JSON.parse(q.queries);
      }

      console.log("q=" + JSON.stringify(q, null, 2));

      reconcile.reconcile(q, res, '');
    } else {
      var metadata = reconcile.metadata('');

      return res.send(metadata);
    }

  });
  
  //--------------------------------------------------------------------------------------
  // handle a GET request for journal details
  // JSON
  app.get("/issn/:issn([0-9]{4}-[0-9]{3}([0-9]|X)\.json)", function(req, res) {

    var issn = req.params.issn;
 
	var data = {};
	data.results = {};

    var callback_parameter = '';
    if (req.query.callback) {
      callback_parameter = req.query.callback;
    }

    var db = cloudant.db.use(process.env.cloudant_database);
    db.view('journal_articles', 'issn-journal', {
      key: issn,
      limit: 1
    }, function(err, body) {
      if (!err) {

        body.rows.forEach(function(row) {
          data.results[row.key] = row.value;
        });
        
        res.setHeader("Content-Type", "text/plain");
        if (callback_parameter != '') {
          res.send(callback_parameter + '(' + JSON.stringify(data, null, 2) + ')');
        } else {
          res.send(JSON.stringify(data, null, 2));
        }    
      }
    });

  });


  //--------------------------------------------------------------------------------------
  // handle a GET request for articles for a given year
  // JSON
  app.get("/issn/:issn/year/:year.json", function(req, res) {

    var issn = req.params.issn;
    var year = parseInt(req.params.year);

	var data = {};
	data.results = [];

    var callback_parameter = '';
    if (req.query.callback) {
      callback_parameter = req.query.callback;
    }

    var db = cloudant.db.use(process.env.cloudant_database);
    db.view('journal_articles', 'issn_year_page', {
      startkey: [issn, year],
      endkey: [issn, (year + 1)],
      include_docs: true
    }, function(err, body) {
      if (!err) {

        body.rows.forEach(function(row) {
          data.results.push(row.doc);
        });
        res.setHeader("Content-Type", "text/plain");
        if (callback_parameter != '') {
          res.send(callback_parameter + '(' + JSON.stringify(data, null, 2) + ')');
        } else {
          res.send(JSON.stringify(data, null, 2));
        }    
      }
    });

  });
  
  //--------------------------------------------------------------------------------------
  // handle a GET request for journal volumes by decade
  // JSON
  app.get("/issn/:issn([0-9]{4}-[0-9]{3}([0-9]|X)/year.json)", function(req, res) {

    var issn = req.params.issn;
 
	var data = {};
	data.results = {};

    var callback_parameter = '';
    if (req.query.callback) {
      callback_parameter = req.query.callback;
    }

    var db = cloudant.db.use(process.env.cloudant_database);
    db.view('journal_articles', 'issn_decade_year', {
      startkey: [issn],
      endkey: [issn, 300],
      group_level: 4
    }, function(err, body) {
      if (!err) {

        body.rows.forEach(function(row) {
          // group by decade
          if (!data.results[row.key[1]]) {
            data.results[row.key[1]] = {};
          }
          // yearly counts
          data.results[row.key[1]][row.key[2]] = row.value;
        });
        
        res.setHeader("Content-Type", "text/plain");
        if (callback_parameter != '') {
          res.send(callback_parameter + '(' + JSON.stringify(data, null, 2) + ')');
        } else {
          res.send(JSON.stringify(data, null, 2));
        }    
      }
    });

  });

  


  //--------------------------------------------------------------------------------------
  // handle a GET request for articles for a given year
  // HTML
  app.get("/issn/:issn/year/:year", function(req, res) {

    var issn = req.params.issn;
    var year = parseInt(req.params.year);

    console.log(issn);
    console.log(year);

    var callback_parameter = '';
    if (req.query.callback) {
      callback_parameter = req.query.callback;
    }

    var db = cloudant.db.use(process.env.cloudant_database);
    db.view('journal_articles', 'issn_year_page', {
      startkey: [issn, year],
      endkey: [issn, (year + 1)],
      include_docs: true
    }, function(err, body) {
      if (!err) {

        var html = '';
        html += '<div>';
        body.rows.forEach(function(row) {
          html += '<h2>' + row.doc.message.title[0] + '</h2>';
          html += '<a href="/id/' + encodeURIComponent(row.doc._id) + '">View</a>';
        });
        html += '</div>';
        return res.send(html);
        //return res.send(body);
      }
    });

  });

  //--------------------------------------------------------------------------------------
  // handle a GET request for an individual record in JSON
  app.get("/id/:id(*\.json)", function(req, res) {

    var id = req.params.id;
    id = id.replace(/\.json$/, '');
    
    console.log(id);

    var callback_parameter = '';
    if (req.query.callback) {
      callback_parameter = req.query.callback;
    }

    // Return a record 
    var db = cloudant.db.use(process.env.cloudant_database);
    db.get(id, function(err, data) {
      res.setHeader("Content-Type", "text/plain");
      
      if (callback_parameter != '') {
        res.send(callback_parameter + '(' + JSON.stringify(data, null, 2) + ')');
      } else {
        res.send(JSON.stringify(data, null, 2));
      }    
    });

  });

  //--------------------------------------------------------------------------------------
  // handle a GET request for an individual record in XML
  app.get("/id/:id(*\.xml)", function(req, res) {

    var id = req.params.id;
    id = id.replace(/\.xml$/, '');
    
    console.log("XML id=" + id);
 

    // Return a record 
    var db = cloudant.db.use(process.env.cloudant_database);
    db.get(id, function(err, data) {
      // convert CSL to JATS XML
      var csl = new CSL();
      var xml = csl.to_JATS(data);
      res.setHeader("Content-Type", "text/xml");
      return res.send(xml);
    });

  });

  //--------------------------------------------------------------------------------------
  // handle a GET request for an individual record
  // display in HTML
  app.get("/id/:id(*)", function(req, res, next) {

    var id = req.params.id;

    console.log("Received GET: " + id);

    // Return a record 
    var db = cloudant.db.use(process.env.cloudant_database);
    db.get(id, function(err, data) {
      var csl = new CSL();
      var xml = csl.to_JATS(data);
      
      console.log(xml);

      var jats = xml;

      var html = '';
      html += '<html>';
      html += '<head>';
      html += `
<style type="text/css">	
@font-face {
  font-family: 'Droid Serif';
  font-style: normal;
  font-weight: normal;
  src: local('Droid Serif'), url('/fonts/droid_serif-webfont.svg#webfontiKqgu7aS') format('svg');
}

@font-face {
  font-family: 'Droid Serif Bold';
  font-style: normal;
  font-weight: bold;
  src: local('Droid Serif'), url('/fonts/droid_serif-webfont.svg#webfontiKqgu7aS') format('svg');
}
body {
	margin:60px;
    font-family: serif;
    line-height: 1.4em;
}
h1 {
    font-family: 'Droid Serif Bold';
    font-weight: bold;
    font-size: 180%;
line-height: 1.4em;
}
li {
   margin: 0 0 0.4em 0;
}
.title {
	padding-top:24px;
}
div.authors {
    width: auto;
    letter-spacing: 1px;
    font-family: Helvetica;
    color: #000000;
    text-transform: uppercase;
    font-weight: bold;
    font-size: 80%;
}
</style>
`;
      html += '<script src="/js/utils.js">';
      html += '</script></head>';
      html += '<body>';
      html += '<div id="x"></div>';
      html += '<script>';
      html += "var jats=`" + jats + "`;";

      html += 'show(jats, "x");</script>';
      html += '</body>';
      html += '</html>';

      //res.setHeader("Content-Type", "text/xml"); 
      return res.send(html);
    });

  });

  //--------------------------------------------------------------------------------------
  app.get("/js/utils.js", function(req, res) {
    res.sendFile(__dirname + '/js/utils.js');
  });

  //--------------------------------------------------------------------------------------
  app.get("/xsl/no-full-text.xsl", function(req, res) {
    res.sendFile(__dirname + '/xsl/no-full-text.xsl');
  });
  
  //--------------------------------------------------------------------------------------
  app.get("/fonts/droid_serif-webfont.svg", function(req, res) {
    res.sendFile(__dirname + '/fonts/droid_serif-webfont.svg');
  });  

  //--------------------------------------------------------------------------------------
  // OpenURL (to do)
  app.get("/openurl", function(req, res) {
    console.log('openurl ' + JSON.stringify(req.query, null, 2));
    res.setHeader("Content-Type", "text/plain");
    res.send(JSON.stringify(req.query, null, 2));
  });
 
  //--------------------------------------------------------------------------------------
  // search JSON
  app.get("/search/:q.json", function(req, res, next) {

    // Search
    var db = cloudant.db.use(process.env.cloudant_database);

    console.log("Received GET: search " + req.params.q);

    var callback_parameter = '';
    if (req.query.callback) {
      callback_parameter = req.query.callback;
    }

    var data = {};
    data.query = req.params.q;
    data.count = 0;
    data.results = [];

    var query = {
      q: req.params.q,

      highlight_fields: ["default"],
      highlight_pre_tag: '"b"',
      highlight_post_tag: '"b"',
      highlight_number: 10,

      //include_docs: true,
      limit: 10
    };

    db.search('search', 'metadata', query, function(er, result) {
      if (er) {
        throw er;
      }

      data.count = result.rows.length;

      console.log(result);

      for (var i = 0; i < result.rows.length; i++) {

        var item = {};
        item.id = result.rows[i].id;
        item.score = result.rows[i].order[0];
        item.content = result.rows[i].fields['default'];

        data.results.push(item);

      }
      res.setHeader("Content-Type", "text/plain");
      if (callback_parameter != '') {
        res.send(callback_parameter + '(' + JSON.stringify(data, null, 2) + ')');
      } else {
        res.send(JSON.stringify(data, null, 2));
      }    
    });

  });

  //--------------------------------------------------------------------------------------
  // search HTML
  app.get("/search/:q", function(req, res, next) {

    // Search
    var db = cloudant.db.use(process.env.cloudant_database);

    console.log("Received GET: " + JSON.stringify(req.body));

    var callback_parameter = '';
    if (req.query.callback) {
      callback_parameter = req.query.callback;
    }

    var query = {
      q: req.params.q,

      highlight_fields: ["default"],
      highlight_pre_tag: '"b"',
      highlight_post_tag: '"b"',
      highlight_number: 10,

      //include_docs: true,
      limit: 10
    };

    db.search('search', 'metadata', query, function(er, result) {
      if (er) {
        throw er;
      }
      var html = '';
      /*
		  html += '<pre>';
		html += JSON.stringify(result, null, 2);
		html += '</pre>';*/

      for (var i = 0; i < result.rows.length; i++) {
        html += 'Document id:' + result.rows[i].id + '<br />';
        html += '<a href="/id/' + encodeURIComponent(result.rows[i].id) + '">View</a>';
        //html += '<a href="/id/' + result.rows[i].id + '">View</a>';

       html += '<pre>';
        html += JSON.stringify(result.rows[i], null, 2);
        html += '</pre>';

      }
      return res.send(html);
    });
  });


  //--------------------------------------------------------------------------------------
  // handle a GET request
  app.get("/", function(req, res) {

 	var html = '<h1>' + process.env.cloudant_database + '</h1>';
	return res.send(html);
 
  });

};
 
module.exports = routes;