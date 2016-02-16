var React = require('react');
var marked = require('marked');

marked.setOptions({
  sanitize: true
});

var UserProfile = React.createClass({
  getDefaultProps() {
    return {title: "User profile", approved:false, show_claim: false,
      host: [], user: {}, viewer: {}, onEdit: null};
  },

  getInitialState() {
    return {claim_clicked: false, unclaim_clicked: false};
  },

  onClaim() {
    this.setState({claim_clicked: true});
    this.props.onClaim(this.props.user.id, true);
  },

  onUnclaim() {
    this.setState({unclaim_clicked: true});
    this.props.onClaim(this.props.user.id, false);
  },

  onApprove() {
    this.props.onApprove(this, this.props.user.id);
  },

  render: function() {
    var claim = <div/>
    if (this.props.show_claim && this.props.user.kind=='UROP' && this.props.host.kind=='Host') {
      if (this.props.host.id == this.props.user.host_id) {
        if (this.state.unclaim_clicked) {
          claim = (<p>Unclaimed</p>);
        } else {
          claim = (
            <p>
              <button onClick={this.onUnclaim} className='btn btn-danger'>Unmatch with this UROP</button>
            </p>
          );
        }
      } else {
        if (this.state.claim_clicked) {
          claim = (<p>Claimed</p>);
        } else {
          if (this.props.host.approved) {
            claim = (
              <button className='btn btn-success' onClick={this.onClaim}>Match with this UROP</button>
            );
          } else {
            claim = (
              <button className='btn btn-default' disabled='disabled'>Must be approved as a host before matching with UROPs</button>
            );
          }
        }
      }
    }
    var user = this.props.user;
    if(user.kind == 'Host') {
      if(this.state.approved) {
        claim = (<p>Approved</p>);
      } else {
        if(!user.approved && this.props.host.approved) {
          claim = (<button onClick={this.onApprove} className='btn btn-success'>Approve this host</button>);
        }
      }
    }
    var cv = <div/>;
    if (user.cv && user.cv.length > 0) {
      cv = (
        <div>
          <a href={`/api/user/${user.id}/cv`}><img src="/static/cv_icon.png" width="50px"/></a>
        </div>
      );
    }
    var urop_fields = <div/>;
    if (user.kind == 'UROP') {
      let statementMarkdown = {__html: marked(user.statement)};
      urop_fields = (
        <span>
          <dt>Statement of interest</dt>
          <dd><span dangerouslySetInnerHTML={statementMarkdown}/></dd>
        </span>
      );
    }

    var research_field = <div/>;
    if (user.kind == 'Host' && user.research && user.research.length > 0) {
      let researchMarkup = {__html: marked(user.research)};
      research_field = (
        <span>
          <dt>Research interests</dt>
          <dd><span dangerouslySetInnerHTML={researchMarkup}/></dd>
        </span>
      );
    }
    var edit_button = <div/>;
    if(this.props.onEdit != null) {
      edit_button = (
        <button className='btn btn-default' onClick={this.props.onEdit}>
          Edit your profile
        </button>);
    }
    return (
      <div className='panel panel-primary'>
        <div className='panel-heading'>
          <h3 className='panel-title'>{this.props.title}</h3>
        </div>
        <div className='panel-body'>
          <dl className='dl-horizontal'>
            <dt>Name</dt>
            <dd>{user.name}</dd>

            <dt>Email</dt>
            <dd><a href={"mailto:"+user.email}>{user.email}</a></dd>
            {urop_fields}
            {research_field}
          </dl>
          {cv}
          {claim}
          {edit_button}
        </div>
      </div>
    );
  }
});


module.exports = {UserProfile}
