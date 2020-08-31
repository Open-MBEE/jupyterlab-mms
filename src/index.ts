import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

//import { requestAPI } from './jupyterlab-mms';
import { INotebookTracker } from '@jupyterlab/notebook';
import { UUID } from '@lumino/coreutils';

/**
 * Initialization data for the jupyterlab-mms extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-mms',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, notebookTracker: INotebookTracker) => {
    console.log('JupyterLab extension jupyterlab-mms is activated!');
    notebookTracker.widgetAdded.connect((sender, panel) => {
      console.log('widgetAdded'); //notebook metadata is not initialized yet - has no mms key
      panel.content.modelChanged.connect((notebook, none) => {
        console.log('content model changed'); //never fires??
      });
      panel.content.modelContentChanged.connect((notebook, none) => {
        console.log('content modelContent changed'); //on close notebook.model becomes null
      });
      panel.model.contentChanged.connect((notebookModel, none) => {
        console.log('model content changed'); //on close notebookModel.cells becomes null, seems fires exactly the same as above
      });
      panel.model.stateChanged.connect((notebookModel, changed) => {
        console.log('model state changed'); //when notebook is fully opened - changed is {name: 'dirty', newValue: false, oldValue: true} - vice versa
      });
      //if (panel.content.model.metadata.has('mms')) {
        console.log('found mms notebook');
        panel.content.model.cells.changed.connect((cells, changed) => {
          console.log('cells changed');
          for (const cell of changed.newValues.values()) {
            if (!cell.metadata.has('mms')) {
              const uid = UUID.uuid4();
              console.log('adding mms cell id ' + uid);
              cell.metadata.set('mms', { id: uid });
            }
          }
        });
      //}
    });

    /*
    requestAPI<any>('get_example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The jupyterlab_mms server extension appears to be missing.\n${reason}`
        );
      });
      */
  }
};

export default extension;
