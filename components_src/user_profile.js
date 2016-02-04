var UserProfile = React.createClass({
  render: function() {
    return (
      <div className='panel panel-primary'>
        <div className='panel-heading'>
          <h3 className='panel-title'>User profile</h3>
        </div>
        <div className='panel-body'>
          <dl className='dl-horizontal'>
            <dt>Name</dt>
            <dd>{this.props.user.name}</dd>

            <dt>Email</dt>
            <dd><a href={"mailto:"+this.props.user.email}>{this.props.user.email}</a></dd>
          </dl>
        </div>
      </div>
    );
  }
});

var UserProfileLoader = React.createClass({
  getDefaultProps: function() {
    return {'user_id': ''};
  },

  getInitialState: function() {
    return {'user': {}, 'status': 'loading'};
  },

  render: function() {
    switch(this.state.status) {
      case 'loading':
        return (
          <p>Loading...</p>
        );
        break;
      case 'loaded':
        return (
          <UserProfile user={this.state.user}/>
        );
        break;
      case 'not_found':
        return (
          <div className='alert alert-danger'>
            User not found
          </div>
        );
        break;
    }
  },

  componentDidMount: function() {
    this.loadUser(this.props.user_id);
  },

  loadUser: function(user_id) {
    $.get({
      url: `/user_profile/get/${user_id}`,
      success: result => {
        console.log(result);
        if(result.status=='ok') {
          this.setState({user: result.payload, status: 'loaded'});
        } else {
          this.setState({status: 'not_found'});
        }
      }
    });
  }
});
