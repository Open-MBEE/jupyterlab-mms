import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './jupyterlab-mms';

/**
 * Initialization data for the jupyterlab-mms extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-mms',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-mms is activated!');
    requestAPI<any>('get_example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The jupyterlab_mms server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default extension;
