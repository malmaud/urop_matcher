let React = require('react');
let {FeedbackForm} = require('./feedback');
let {Home} = require('./home_page');
let {HostForm} = require('./host_register');
let {Browse} = require('./browse');
let {UROPForm} = require('./urop_submit');
let MockLogin = require('./mock');

let Content = React.createClass({
  getDefaultProps() {
    return {page: null, user: null, host: null, urops: null, user_id: null};
  },

  render() {
    switch(this.props.page) {
      case 'feedback':
      return <FeedbackForm user={this.props.user}/>;
      break;
      case 'home':
      return <Home user={this.props.user} host={this.props.host} urops={this.props.urops} user_id={this.props.user_id}/>;
      break;
      case 'host_register':
      return <HostForm/>;
      case 'browse':
      return <Browse current_user={this.props.user} users={this.props.users}/>;
      break;
      case 'urop_register':
      return <UROPForm/>;
      break;
      case 'mock_login':
      return <MockLogin/>;
      break;
      default:
      return (<p>Unknown</p>);
      break;
    }
  }
});

module.exports = Content;
