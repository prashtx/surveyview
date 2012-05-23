
var Scan = Backbone.Model.extend({});
var Scans = Backbone.Collection.extend({
  model: Scan,
  url: BASEURL + '/surveys/' + surveyid + '/scans',
  parse: function(resp) {
    return resp.scans.sort(compareCreatedNewToOld);
  }
});

function friendlyStatus(status) {
  if (status === 'pending') {
    return 'awaiting processing';
  }
  if (status === 'working') {
    return 'processing in progress';
  }
  if (status === 'completed') {
    return 'processed';
  }
  return status;
}

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
        status: friendlyStatus(scan.get('status')),
        url: scan.get('url')
      };
      this.$('#scans-body').append(_.template($('#scan-item').html(), data));
    });
    return this;
  }
});

var ScansPageView = Backbone.View.extend({
  el: '#scans-page',
  initialize: function initialize(scans) {
    // Set up models.
    this.scans = scans;
    this.scans.on('all', this.render, this);

    // Set up templating
    this.count_template = this.$('#count-template');

    // Set up views.
    this.scanListView = new ScanListView(this.scans);
  },
  refresh: function refresh() {
    this.scans.fetch();
  },
  render: function render() {
    htmlTemplate(this.$('#scan-count'), this.count_template, {count: this.scans.length});
    htmlTemplate(this.$('#pending-count'), this.count_template, {
      count: this.scans.reduce(function(memo, scan) {
        if (scan.get('status') === 'pending') {
          return memo + 1;
        }
        return memo;
      }, 0)
    });
    htmlTemplate(this.$('#working-count'), this.count_template, {
      count: this.scans.reduce(function(memo, scan) {
        if (scan.get('status') === 'working') {
          return memo + 1;
        }
        return memo;
      }, 0)
    });
    htmlTemplate(this.$('#completed-count'), this.count_template, {
      count: this.scans.reduce(function(memo, scan) {
        if (scan.get('status') === 'completed') {
          return memo + 1;
        }
        return memo;
      }, 0)
    });
    return this;
  },
  events: {
    'click #refresh-button': 'refresh',
    'show': 'refresh'
  },
  show: function show() {
    this.refresh();
    this.$el.show();
  }
});


