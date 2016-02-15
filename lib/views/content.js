let React = require('react');
let {FeedbackForm} = require('./feedback');
let {Home} = require('./home_page');
let {HostForm} = require('./host_register');
let {Browse} = require('./browse');
let {UROPForm} = require('./urop_submit');

let Content = React.createClass({
  getDefaultProps() {
    return {page: null, user: null, host: null};
  },

  render() {
    switch(this.props.page) {
      case 'feedback':
      return <FeedbackForm user={this.props.user}/>;
      break;
      case 'home':
      return <Home user={this.props.user} host={this.props.host}/>;
      break;
      case 'host_register':
      return <HostForm/>;
      case 'browse':
      return <Browse current_user={this.props.user} users={this.props.users}/>;
      break;
      case 'urop_register':
      return <UROPForm/>;
      break;
      default:
      return (<p>Unknown</p>);
      break;
    }
  }
});

module.exports = Content;
