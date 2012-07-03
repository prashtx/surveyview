
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
var AppView = Backbone.View.extend({
  el: 'body',
  initialize: function initialize(survey) {
    this.survey = survey;
    this.survey.on('all', this.render, this);
    this.survey.fetch();
  },
  render: function render() {
    htmlTemplate(this.$('#header-survey'),
                 this.$('#header-survey-template'),
                 {
                   name: this.survey.get('name')
                 });
    return this;
  }
});

function makeNavItem(id, fragment, title) {
  var item = {
    id: id,
    fragment: fragment,
    title: title
  }
  return item;
}

function NavItems() {
  this.items = [
    makeNavItem('responses', 'surveys/' + surveyid + '/responses', 'Responses'),
    makeNavItem('scans', 'surveys/' + surveyid + '/scans', 'Scans'),
    makeNavItem('upload', 'surveys/' + surveyid + '/upload', 'Upload')
  ];

  this.current = this.items[0];
}

var NavTabsView = Backbone.View.extend({
  el: '#nav-tabs',
  initialize: function(navItems, router) {
    router.on('all', this.render, this);
    this.navItems = navItems;

    this.render();

    this.events = {};
    _.each(this.navItems.items, function(item) {
      // Set up the click events
      this.events['click #' + item.id] = function(event) {
        event.preventDefault();
        this.navItems.current = item;
        router.navigate(item.fragment, {trigger: true});
      }
      router.on('route:' + item.id, function() { this.navItems.current = item; }, this);
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
  if (pageView.show !== undefined) {
    pageView.show();
  } else {
    pageView.$el.show();
  }
}

$(document).ready(function() {
  // Hide all of the pages. We'll show one at a time as appropriate.
  $('.page').hide();

  var survey = new Survey();
  var responses = new Responses({pageSize: 20});
  var scans = new Scans();
  var appView = new AppView(survey);
  var responsesPageView = new ResponsesPageView(responses);
  var scansPageView = new ScansPageView(scans);
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
  router.route('', 'responses', function(path) {
    switchPage(responsesPageView);
  });
  var navItems = new NavItems();
  var navTabsView = new NavTabsView(navItems, router);

  Backbone.history.start({pushState: false});
});
