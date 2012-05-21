var BASEURL = 'http://surveydet.herokuapp.com';
var surveyid = 'b53eed70-9337-11e1-9bf5-39dee61cc65b';

// Models
var Response = Backbone.Model.extend({
});

var Survey = Backbone.Model.extend({
  url: BASEURL + '/surveys/' + surveyid,
  parse: function(resp) {
    return resp.survey;
  }
});

var Responses = Backbone.Collection.extend({
  model: Response,
  url: BASEURL + '/surveys/' + surveyid + '/responses',
  parse: function(resp) {
    return resp.responses;
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

    return attributes;
  }
});

// Views
var Header = Backbone.View.extend({
  el: '#header',
  initialize: function(survey, responses) {
    this.responses = responses;
    this.responses.on('all', this.render, this);
    this.survey = survey;
    this.survey.on('all', this.render, this);
    this.render();
  },
  render: function() {
    var data = {
      title: this.survey.get('name'),
      count: this.responses.length
    };
    $(this.el).html(_.template($('#header-template').html(), data));
  }
});

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
    var questions = this.formInfo.get('questions');
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
  }
});

var SurveyPageView = Backbone.View.extend({
  el: '#survey-page',
  initialize: function() {
    // Set up models.
    this.responses = new Responses();
    this.survey = new Survey();
    this.formInfo = new FormInfo();

    // Get model data.
    this.refresh();

    // Set up views.
    this.header = new Header(this.survey, this.responses);
    this.responseListView = new ResponseListView(this.formInfo, this.responses);
  },
  refresh: function() {
    this.survey.fetch();
    this.formInfo.fetch();
    this.responses.fetch();
  },
  getCSV: function() {
    window.location = BASEURL + '/surveys/' + surveyid + '/csv';
  },
  events: {
    'click #refresh-button': 'refresh',
    'click #csv-button': 'getCSV'
  }
});

var ResponsePageView = Backbone.View.extend({
  el: '#response-page',
});

function hidePages() {
  $('.page').each(function(el) { el.hide; });
}

var surveyPageView = new SurveyPageView();
var responsePageView = new ResponsePageView();

var router = new Backbone.Router({
  routes: {
    'surveys/:sid/responses/:rid': function(sid, rid) {
      hidePages();
      // Set up model for the response page
      // XXX
      responsePageView.$el.show();
    },
    '': function() {
      hidePages();
      surveyPageView.$el.show();
    }
  }
});
