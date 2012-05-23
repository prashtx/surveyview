
function htmlTemplate(el, plate, data) {
  el.html(_.template(plate.html(), data));
}

function friendlyDate(str) {
  if (!str) {
    return 'unknown';
  }
  var d = new Date(str);
  var now = new Date();
  if (d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()) {
    return 'Today at ' + d.toLocaleTimeString();
  }
  return d.toLocaleDateString();
}

var Scan = Backbone.Model.extend({});
var Scans = Backbone.Collection.extend({
  model: Scan,
  url: BASEURL + '/surveys/' + surveyid + '/scans',
  parse: function(resp) {
    return resp.scans;
  }
});

var ScanListView = Backbone.View.extend({
  el: '#scans',
  initialize: function(scans) {
    this.scans = scans;
    this.scans.on('all', this.render, this);
  },
  render: function() {
    this.$('#scans-body').html('');
    this.scans.each(function(scan) {
      var data = {
        id: scan.get('id'),
        date: friendlyDate(scan.get('created')),
        filename: scan.get('filename'),
        status: scan.get('status'),
        url: scan.get('url')
      };
      this.$('#scans-body').append(_.template($('#scan-item').html(), data));
    });
    return this;
  }
});

var ScansPageView = Backbone.View.extend({
  el: '#scans-page',
  initialize: function initialize(survey) {
    // Set up models.
    this.scans = new Scans();
    this.scans.on('all', this.render, this);
    this.survey = survey;
    this.survey.on('all', this.render, this);

    // Set up templating
    this.scan_header = this.$('#scan-header');
    this.scan_header_template = $('#scan-header-template');
    this.scan_count = this.$('#scan-count');
    this.pending_count = this.$('#pending-count');
    this.working_count = this.$('#working-count');
    this.completed_count = this.$('#completed-count');
    this.count_template = this.$('#count-template');

    // Get model data.
    this.refresh();

    // Set up views.
    this.scanListView = new ScanListView(this.scans);
  },
  refresh: function refresh() {
    this.scans.fetch();
    this.survey.fetch();
  },
  render: function render() {
    htmlTemplate(this.scan_header,
                 this.scan_header_template,
                 {
                   title: this.survey.get('name'),
                   count: this.scans.length
                 });
    htmlTemplate(this.scan_count, this.count_template, {count: this.scans.length});
    htmlTemplate(this.pending_count, this.count_template, {
      count: this.scans.reduce(function(memo, scan) {
        if (scan.get('status') === 'pending') {
          return memo + 1;
        }
        return memo;
      }, 0)
    });
    htmlTemplate(this.working_count, this.count_template, {
      count: this.scans.reduce(function(memo, scan) {
        if (scan.get('status') === 'working') {
          return memo + 1;
        }
        return memo;
      }, 0)
    });
    htmlTemplate(this.completed_count, this.count_template, {
      count: this.scans.reduce(function(memo, scan) {
        if (scan.get('status') === 'completed') {
          return memo + 1;
        }
        return memo;
      }, 0)
    });
    //this.$('#scan-header').html(_.template($('#scan-header-template').html(), {title: this.survey.get('name'), count: this.scans.length}));
    return this;
  },
  events: {
    'click #refresh-button': 'refresh'
  }
});


// Models
var Response = Backbone.Model.extend({
});

var Responses = Backbone.Collection.extend({
  model: Response,
  url: BASEURL + '/surveys/' + surveyid + '/responses',
  parse: function(resp) {
    // Sort newest first
    return resp.responses.sort(function(a, b) {
      if (a.created === undefined) {
        return 1;
      }
      if (a.created > b.created) {
        return -1;
      }
      if (a.created < b.created) {
        return 1;
      }
      return 0;
    });
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
  initialize: function(survey) {
    // Set up models.
    this.responses = new Responses();
    this.responses.on('all', this.render, this);
    this.survey = survey;
    this.survey.on('all', this.render, this);
    this.formInfo = new FormInfo();

    // Get model data.
    this.refresh();

    // Set up views.
    this.responseListView = new ResponseListView(this.formInfo, this.responses);
  },
  refresh: function() {
    this.survey.fetch();
    this.formInfo.fetch();
    this.responses.fetch();
  },
  render: function() {
    htmlTemplate(this.$('#responses-header'),
                 this.$('#header-template'),
                 {
                   title: this.survey.get('name')
                 });
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
  }
});


// Uploads
var UploadPageView = Backbone.View.extend({
  el: '#upload-page',
  initialize: function initialize() {
    var el = document.getElementById('file-uploader');
    var uploader = new qq.FileUploader({
      element: document.getElementById('file-uploader'),
      action: BASEURL + '/surveys/' + surveyid + '/scans',
      debug: true,
      extraDropzones: [qq.getByClass(document, 'drop-area')[0]]
    });
  }
});

// Models
var Survey = Backbone.Model.extend({
  url: BASEURL + '/surveys/' + surveyid,
  parse: function(resp) {
    return resp.survey;
  }
});


// Views
var SurveyPageView = Backbone.View.extend({
  el: '#survey-page'
});

function makeNavItem(id, fragment, title) {
  var item = {
    id: id,
    fragment: fragment,
    title: title
  }
  return item;
}

function NavItems(router) {
  this.items = [
    makeNavItem('responses', 'surveys/' + surveyid + '/responses', 'Responses'),
    makeNavItem('scans', 'surveys/' + surveyid + '/scans', 'Scans'),
    makeNavItem('upload', 'surveys/' + surveyid + '/upload', 'Upload')
  ];

  this.current = this.items[0];

  this.navigate = function(item) {
    this.current = item;
    router.navigate(item.fragment, {trigger: true});
  }
}

var NavTabsView = Backbone.View.extend({
  el: '#nav-tabs',
  initialize: function(navItems, router) {
    router.on('all', this.render, this);
    this.navItems = navItems;

    this.render();

    this.events = {};
    _.each(this.navItems.items, function(item) {
      this.events['click #' + item.id] = function(event) {
        event.preventDefault();
        this.navItems.current = item;
        this.navItems.navigate(item);
      }
    }, this);
    this.delegateEvents(this.events);
  },
  render: function() {
    this.$el.html('');
    _.each(this.navItems.items, function(item) {
      var data = {
        id: item.id,
        css: '',
        title: item.title
      };
      if (item === this.navItems.current) {
        data.css = 'active';
      }
      this.$el.append(_.template($('#nav-tab-item').html(), data));
    }, this);
    return this;
  }
});

function switchPage(pageView) {
  $('.page').hide();
  pageView.$el.show();
}

$(document).ready(function() {
  var survey = new Survey();
  var surveyPageView = new SurveyPageView();
  var responsesPageView = new ResponsesPageView(survey);
  var scansPageView = new ScansPageView(survey);
  var uploadPageView = new UploadPageView();
  survey.fetch();

  var router = new Backbone.Router();
  router.route('surveys/:sid/scans', 'scans', function(sid) {
    switchPage(scansPageView);
  });
  router.route('surveys/:sid/upload', 'upload', function(sid) {
    switchPage(uploadPageView);
  });
  router.route('surveys/:sid/responses', 'responses', function(path) {
    switchPage(responsesPageView);
  });
  var navItems = new NavItems(router);
  var navTabsView = new NavTabsView(navItems, router);

  Backbone.history.start({pushState: false});
  router.navigate('surveys/' + surveyid + '/responses', {trigger: true, replace: false});
});
