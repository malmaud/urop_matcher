var React = require('react');
var user_profile = require('./user_profile.js');
var UserProfileLoader = user_profile.UserProfileLoader;
var UserProfile = user_profile.UserProfile;
var HostForm = require('./host_register.js').HostForm;
var UROPForm = require('./urop_submit.js').UROPForm;
var LinkedStateMixin = require('react-addons-linked-state-mixin');
let $ = require('jquery');

var HostHome = React.createClass({
  getDefaultProps() {
    return {urops: [], user: []};
  },

  render() {
    let urop_list = this.props.urops.map(urop=>{
      return (<UserProfile host={this.props.user} user={urop} key={urop.user_id} show_claim={false}/>);
    });
    let inner = <div/>;
    if (urop_list.length > 0) {
      inner = (
        <div>
          <h2>Your UROPs</h2>
          {urop_list}
        </div>
      );
    } else {
      inner = (
        <div>
          <p>You don't have any UROPs yet. <a href="/browse">Browse for some</a>.</p>
        </div>
      );
    }
    let alert = <div/>;
    let user = this.props.user;
    if(!user.approved) {
      alert = (
        <div className='alert alert-danger'>
          You are not yet approved. An existing approved host has to approve you before you can match with UROPs.
        </div>
      );
    }
    return (
      <div>
        {alert}
        {inner}
      </div>
    );
  }
});

var UROPHome = React.createClass({
  getDefaultProps() {
    return {host: null, user: []};
  },

  render() {
    var host = this.props.host;
    var inner = <div/>;
    if (host.name) {
      inner = (
        <div>
          <UserProfile title="Host profile" user={host}/>
        </div>
      );
    } else {
      inner =  (
        <p>No host yet.</p>
      );
    }
    return (
      <div>
        <h3>Host information</h3>
        {inner}
      </div>
    );
  }
});

var PersonalProfile = React.createClass({
  mixins: [LinkedStateMixin],

  getInitialState() {
    var user = this.props.user;
    return {mode: 'view', name: user.name, email:user.email,
      statement:user.statement, research: user.research, CVChosen: false, cv_status: null};
  },

  getDefaultProps() {
    return {user: null, onEdit: null};
  },

  onEdit() {
    this.setState({mode: 'edit'});
  },

  onSubmit(event) {
    event.preventDefault();
    var user = JSON.parse(JSON.stringify(this.props.user));
    user.name = this.state.name;
    user.email = this.state.email;
    user.statement = this.state.statement;
    user.research = this.state.research;
    this.props.onEdit(user);
    this.setState({mode: 'view'});
  },

  onCancelEdit(event) {
    event.preventDefault();
    this.setState({mode: 'view'});
  },

  onCVChosen(event) {
    this.setState({CVChosen: true});
  },

  onNewCV(event) {
    let cv = this.refs.cv.files[0];
    this.setState({cv_status: 'uploaded'});
    this.props.onNewCV(cv);
  },

  onDeleteCV(event) {
    this.setState({cv_status: 'deleted'});
    this.props.onDeleteCV();
  },

  renderEdit() {
    var personal_edit = <div/>;
    var user = this.props.user;
    switch(user.kind) {
      case 'Host':
        personal_edit = (
          <div className='form-group'>
            <label className='col-sm-2'>Research interests</label>
            <div className='col-sm-10'>
              <textarea className='form-control' rows="10" valueLink={this.linkState('research')}/>
            </div>
          </div>
        );
      break;
      case 'UROP':
        let new_cv_disabled = 'disabled';
        if(this.state.CVChosen) new_cv_disabled = '';
        let delete_cv_disabled = 'disabled';
        if(user.cv && user.cv.length > 0) {
          delete_cv_disabled = '';
        }
        let cv_info = <div/>;
        switch(this.state.cv_status) {
          case 'deleted':
          cv_info = <p>Deleted</p>;
          break;
          case 'uploaded':
          cv_info = <p>Uploaded</p>;
          break;
        }
        personal_edit = (
          <div>
            <div className='form-group'>
              <label className='col-sm-2'>Statement of interest</label>
              <div className='col-sm-10'>
                <textarea className='form-control' rows="10" valueLink={this.linkState('statement')}/>
              </div>
            </div>
            <div className='form-group'>
              <label className='col-sm-2'>CV</label>
              <div className='col-sm-2'>
                <input ref='cv' type='file' onChange={this.onCVChosen}/>
              </div>
              <div className='btn-group' style={{marginLeft: '100px'}}>
                <button type='button' className='btn btn-default btn-sm' disabled={new_cv_disabled} onClick={this.onNewCV}>Upload new CV</button>
                <button type='button' className='btn btn-default btn-sm' disabled={delete_cv_disabled} onClick={this.onDeleteCV}>Delete CV</button>
              </div>
              {cv_info}
            </div>
          </div>
        );
      break;
    }
    return (
      <div className='panel panel-primary'>
        <div className='panel-heading'>
          <h3 className='panel-title'>Editing your profile</h3>
        </div>
        <div className='panel-body'>
          <form className='form-horizontal' onSubmit={this.onSubmit}>
            <div className='form-group'>
              <label className='col-sm-2'>Name</label>
              <div className='col-sm-10'>
                <input type='text' className='form-control' valueLink={this.linkState('name')}/>
              </div>
            </div>
            <div className='form-group'>
              <label className='col-sm-2'>Email</label>
              <div className='col-sm-10'>
                <input type='text' className='form-control' valueLink={this.linkState('email')}/>
              </div>
            </div>
            {personal_edit}
            <div className='form-group'>
              <div className='col-sm-2'>
                <button type='submit' className='btn btn-success'>Confirm edit</button>
              </div>
              <div className='col-sm-2'>
                <button className='btn btn-danger' onClick={this.onCancelEdit}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  },

  render() {
    switch (this.state.mode) {
      case 'view':
      return (
        <div>
          <UserProfile title="Your profile" user={this.props.user} onEdit={this.onEdit}/>
        </div>
      );

      case 'edit':
      return this.renderEdit();
      break;
    }
  }
});

var Home = React.createClass({
  getDefaultProps() {
    return {user: {}, urops: [], host: []};
  },

  getInitialState() {
    return {user: this.props.user};
  },

  onProfileEdit(new_user) {
    this.setState({user: new_user});
    var data = {name: new_user.name, email: new_user.email,
      statement: new_user.statement, research: new_user.research};
    $.ajax({
      method: 'put',
      url: `/api/user/${new_user.id}`,
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: result=>{
        console.log(`edit response: ${result.status}`);
      }
    });
  },

  onNewCV(file) {
    let fd = new FormData();
    fd.append('cv', file);
    $.ajax({
      method: 'put',
      url: `/api/user/${this.state.user.id}/cv`,
      success: result=>{
        console.log(result);
        let user = this.state.user;
        user.cv = result.cv_filename;
        this.setState({user: user});
      },
      data: fd,
      processData: false,
      contentType: false
    });
  },

  onDeleteCV() {
    $.ajax({
      method: 'delete',
      url: `/cv/${this.state.user.user_id}`,
      success: result=>{
        console.log(result);
        let user = this.state.user;
        user.cv = '';
        this.setState({user: user});
      }
    });
  },

  renderSignup() {
    return (
      <div>
      Not signed up yet
      </div>
    );
  },

  render() {
    var kindHome;
    if(!this.props.user) {
      return this.renderSignup();
    }
    let kind = this.props.user.kind;
    switch(kind) {
      case 'Host':
      kindHome = (<HostHome user={this.state.user} urops={this.props.urops}/>);
      break;
      case 'UROP':
      kindHome = (<UROPHome user={this.state.user} host={this.props.host}/>);
      break;
    }
    return (
      <div>
        <div className='page-header'>
          <h1>Home</h1>
        </div>
        <PersonalProfile onEdit={this.onProfileEdit} user={this.state.user} onNewCV={this.onNewCV} onDeleteCV={this.onDeleteCV}/>
        {kindHome}
      </div>
    );
  }
});

module.exports = {Home, UROPHome, HostHome}
