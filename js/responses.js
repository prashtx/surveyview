// Models
var Response = Backbone.Model.extend({
});

var Responses = Backbone.Collection.extend({
  model: Response,
  url: BASEURL + '/surveys/' + surveyid + '/responses',
  parse: function(resp) {
    // Sort newest first
    return resp.responses.sort(compareCreatedNewToOld);
  }
});

function union(arrays) {
  return _.union.apply(_, arrays);
}

// Get the info on the forms used to record responses. This is how we know
// which fields to expect in the responses.
var FormInfo = Backbone.Model.extend({
  url: BASEURL + '/surveys/' + surveyid + '/forms',
  parse: function(resp) {
    attributes = {};

    // Get all of the questions.
    attributes.questions = union(_.map(resp.forms, function(form) {
      // Paper form info
      if (form.type === 'paper') {
        return union(_.map(form.parcels, function(parcel) {
          return union(_.map(parcel.bubblesets, function(bset) {
            return bset.name;
          }));
        }));
      }
      // TODO: mobile form info
      return [];
    }));

    // XXX
    attributes.questions = ['collector', 'site', 'number-of-buildings', 'use', 'service-use', 'design', 'vacancy-1', 'condition-1'];
    // XXX
    return attributes;
  }
});

// Construct the list of questions by scanning each response object
function getQuestions(respCollection) {
  var questions = [];
  var questionHash = {};

  respCollection.each(function(respModel) {
    var qa = respModel.get('responses');
    for (var question in qa) {
      if (qa.hasOwnProperty(question) && !(question in questionHash)) {
        questions.push(question);
        questionHash[question] = true;
      }
    }
  });

  return questions;
}

// Views
var ResponseListView = Backbone.View.extend({
  el: '#responses',
  initialize: function(formInfo, responses) {
    this.formInfo = formInfo;
    this.formInfo.on('all', this.render, this);
    this.responses = responses;
    this.responses.on('all', this.render, this);
    //this.render();
  },
  render: function() {
    //var questions = this.formInfo.get('questions');
    var questions = getQuestions(this.responses);
    if (!questions) {
      return;
    }
    var headData = {values: questions};
    this.$('#responses-head').html(_.template($('#resp-head').html(), headData));
    this.$('#responses-body').html('');
    this.responses.each(function(response) {
      var data = {
        type: response.get('source').type,
        parcel_id: response.get('parcel_id'),
        created: friendlyDate(response.get('created')),
        values: []
      };
      for (var i = 0; i < questions.length; i++) {
        var value = response.get('responses')[questions[i]];
        if (value === undefined) {
          value = '';
        }
        data.values.push(value);
      }
      this.$('#responses-body').append(_.template($('#resp-body-item').html(), data));
    });
    return this;
  }
});

var ResponsesPageView = Backbone.View.extend({
  el: '#responses-page',
  initialize: function(responses) {
    // Set up models.
    this.responses = responses;
    this.responses.on('all', this.render, this);
    this.formInfo = new FormInfo();

    // Get model data.
    //this.refresh();

    // Set up views.
    this.responseListView = new ResponseListView(this.formInfo, this.responses);
  },
  refresh: function() {
    // Get model data.
    this.formInfo.fetch();
    this.responses.fetch();
  },
  render: function() {
    htmlTemplate(this.$('#response-count'),
                 this.$('#count-template'),
                 { count: this.responses.length });

    return this;
  },
  getCSV: function() {
    window.location = BASEURL + '/surveys/' + surveyid + '/csv';
  },
  events: {
    'click #refresh-button': 'refresh',
    'click #csv-button': 'getCSV'
  },
  show: function() {
    this.refresh();
    this.$el.show();
  }
});
