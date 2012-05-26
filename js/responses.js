// Models
var Response = Backbone.Model.extend({
});

var Responses = Backbone.Collection.extend({
  model: Response,
  url: BASEURL + '/surveys/' + surveyid + '/responses',
  initialize: function(options) {
    this.pageSize = options.pageSize;
  },
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
var PaginationItem = Backbone.View.extend({
  render: function() {
    var $plate = this.options.$plate;
    var data = {css: '', label: this.options.label};
    if (this.options.css !== undefined) {
      data.css = this.options.css;
    }
    this.setElement($(_.template($plate.html(), data)));

    return this;
  },
  events: function() {
    if (this.options.css === 'disabled' || this.options.css === 'active') {
      return {};
    }
    return {'click' : 'setPage'};
  },
  setPage: function(e) {
    e.preventDefault();
    this.options.parent.page = this.options.page;
    this.options.parent.render();
  }
});

var ResponseListView = Backbone.View.extend({
  el: '#responses',
  initialize: function(formInfo, responses) {
    //this.formInfo = formInfo;
    //this.formInfo.on('all', this.render, this);
    this.responses = responses;
    this.responses.on('all', this.render, this);
    this.page = 0;
    this.pageListCount = 10;
    this.pageItemsTop = [];
    this.pageItemsBottom = [];
    //this.render();
  },
  render: function() {
    // Headers
    //var questions = this.formInfo.get('questions');
    var questions = getQuestions(this.responses);
    if (!questions) {
      return;
    }
    var headData = {values: questions};
    this.$('#responses-head').html(_.template($('#resp-head').html(), headData));

    // Clear table body
    this.$('#responses-body').html('');

    // Get the page and count info.
    var page = this.page;
    var pageSize = this.responses.pageSize;
    var responseCount = this.responses.length;
    var pageCount = Math.ceil(responseCount / pageSize);

    // Add rows.
    var limit = (page + 1) * pageSize;
    if (limit > responseCount) {
      limit = responseCount;
    }
    for (var i = page * pageSize; i < limit; i++) {
      (function(response) {
        var data = {
          type: response.get('source').type,
          parcel_id: response.get('parcel_id'),
          created: friendlyDate(response.get('created')),
          values: []
        };
        var answers = response.get('responses');
        for (var i = 0; i < questions.length; i++) {
          var value = answers[questions[i]];
          if (value === undefined) {
            value = '';
          }
          data.values.push(value);
        }
        this.$('#responses-body').append(_.template($('#resp-body-item').html(), data));
      })(this.responses.at(i));
    }

    // Set up pagination links.
    while (this.pageItemsTop.length > 0) {
      this.pageItemsTop.pop().remove();
    }
    while (this.pageItemsBottom.length > 0) {
      this.pageItemsBottom.pop().remove();
    }
    var startPage = this.page - Math.floor(this.pageListCount / 2);
    if (startPage < 0) {
      startPage = 0;
    }
    var pageLimit = startPage + this.pageListCount;
    if (pageLimit > pageCount) {
      startPage = startPage - (pageLimit - pageCount);
      pageLimit = pageCount;
    }
    if (startPage < 0) {
      startPage = 0;
    }

    var $piTemplate = this.$('#page-li-template');
    var css = '';
    if (this.page == 0) {
      css = 'disabled';
    }
    var piOptions = {
      parent: this,
      $plate: $piTemplate,
      css: css,
      page: this.page - 1,
      label: 'Prev'
    };
    this.pageItemsTop.push(new PaginationItem(piOptions));
    this.pageItemsBottom.push(new PaginationItem(piOptions));

    for (var i = startPage; i < pageLimit; i++) {
      (function(parentView, pageIndex) {
        var css = '';
        if (pageIndex == page) {
          css = 'active';
        }
        var options = {
          parent: parentView,
          $plate: $piTemplate,
          css: css,
          page: pageIndex,
          label: pageIndex + 1
        };
        parentView.pageItemsTop.push(new PaginationItem(options));
        parentView.pageItemsBottom.push(new PaginationItem(options));
      })(this, i);
    }

    var css = '';
    if (this.page == pageCount - 1) {
      css = 'disabled';
    }
    var piOptions = {
      parent: this,
      $plate: $piTemplate,
      css: css,
      page: this.page + 1,
      label: 'Next'
    };
    this.pageItemsTop.push(new PaginationItem(piOptions));
    this.pageItemsBottom.push(new PaginationItem(piOptions));

    _.each(this.pageItemsTop, function(item) {
      this.$('#response-page-list-top').append(item.render().$el);
    });
    _.each(this.pageItemsBottom, function(item) {
      this.$('#response-page-list-bottom').append(item.render().$el);
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
    //this.formInfo.fetch();
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
