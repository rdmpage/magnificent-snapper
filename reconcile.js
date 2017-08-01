/* complete rethink */
var ReconcilationAPI = function() {};

var async = require('async');
var request = require('request');
var lcs = require('longest-common-subsequence');

// define the type of object
var type = { id: "https://schema.org/CreativeWork", name: "CreativeWork" };

// clean a string 
function clean_string(s) {
  s = s.replace(/[:|-|\.|,|;|\(|\)|\?]/g, '');
  s = s.replace(/<i>/ig, '');
  s = s.replace(/<\/i>/ig, '');
  s = s.replace(/<b>/ig, '');
  s = s.replace(/<\/b>/ig, '');

  s = s.toLowerCase();
  return s;
}

// Function to call service that reconciles a single query
var reconcile = function(req, callback) {
  request(req,
    function(error, response, body) {
      if (!error && response.statusCode == 200) {

        var results = [];
        
        //console.log('reconcile ' + JSON.stringify(body, null, 2));

        if (body.count > 0) {
          
          // this code is specific to the external service we are using,
          // in this case our own search API
          var query_string = body.query;
          query_string = clean_string(query_string);

          // limit ourselves to 3 results
          var n = Math.min(body.results.length, 3);
          for (var i = 0; i < n; i++) {
            var result = {};

            result.type = [type];

            // simplify external result here

            result.id = body.results[i].id;
            result.name = body.results[i].content;
            
            
            // test whether it is a good match by finding longest common subsequence
            // of query and hit
            var hit_string = result.name;
            hit_string = clean_string(hit_string);
                      
            var subsequence = lcs(query_string, hit_string);
            var d = subsequence.length / Math.min(query_string.length, hit_string.length);
            
            result.score = d;
            
            // accept match if above threshold
            result.match = (d > 0.8);
  
            results.push(result);
          }
        }
        callback(null, results);
      }
    }
  );
}

ReconcilationAPI.prototype.metadata = function() {
  var metadata = {};
  
  metadata.name = 'magnificent-snapper';
  metadata.identifierSpace = 'https://magnificent-snapper.glitch.me/';
  metadata.schemaSpace = 'http://rdf.freebase.com/ns/type.object.id';
 
  metadata.view = {};
  metadata.view.url = 'https://magnificent-snapper.glitch.me/id/{{id}}';

  metadata.preview = {};
  metadata.preview.url = 'https://magnificent-snapper.glitch.me/id/{{id}}';
  metadata.preview.width = 430;
  metadata.preview.height = 300;
  
  metadata.defaultTypes = [type];
 
  return metadata;
}

// Use async to send requests and capture results at the end
ReconcilationAPI.prototype.reconcile = function(queries, res, callback_parameter) {
  
  // generate a list of requests we are going to make to external service
  var query_list = [];
  for (var i in queries) {

    // clean
    var q = queries[i].query;
    q = q.replace(/[\?|:|\[|\]|\(|\)|�|\&]/g, '');
    
    var req = {
      method: "GET",
      url: 'https://magnificent-snapper.glitch.me/search/' + encodeURIComponent(q) + '.json',
      json: true
    };

    query_list.push(req);
  }

  // async map calls our "reconcile" function for each request
  async.map(query_list, reconcile,
    // optional callback
    function(err, results) {

      var query_response = {};

      for (var i in results) {
        var key = 'q' + i;

        query_response[key] = {};
        query_response[key].result = results[i];
      }
    
      if (callback_parameter != '') {
        query_response = callback_parameter + '(' + JSON.stringify(query_response) + ')';
      } else {
        query_response = JSON.stringify(query_response);
      }    

      res.send(query_response);
    });


}


module.exports = ReconcilationAPI;
