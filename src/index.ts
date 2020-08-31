import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

//import { requestAPI } from './jupyterlab-mms';
import { INotebookModel, NotebookPanel } from '@jupyterlab/notebook';
import { UUID } from '@lumino/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDisposable } from '@lumino/disposable';
import { Widget } from '@lumino/widgets';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { ICellModel } from '@jupyterlab/cells';
import { IObservableUndoableList } from '@jupyterlab/observables';
import { IObservableList } from '@jupyterlab/observables/lib/observablelist';

/**
 * Initialization data for the jupyterlab-mms extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-mms',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-mms is activated!');
    app.docRegistry.addWidgetExtension(
      'Notebook',
      new MmsNotebookWidgetExtension()
    );

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

class MmsNotebookWidgetExtension
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    return new MmsNotebookWidget(panel, context);
  }
}

class MmsNotebookWidget extends Widget {
  _panel: NotebookPanel;
  _context: DocumentRegistry.IContext<INotebookModel>;

  constructor(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ) {
    super();
    this._panel = panel;
    this._context = context;

    panel.model.stateChanged.connect(this._init, this);
  }

  private _init(
    model: INotebookModel,
    change: IChangedArgs<any, any, string>
  ): void {
    // Notebook is no longer in dirty state (i.e., it has loaded)
    if ('dirty' === change.name && false === change.newValue) {
      // disconnect from state change signal
      model.stateChanged.disconnect(this._init, this);
      if (model.metadata.has('mms')) {
        console.log('mms notebook opened');
        model.cells.changed.connect(this._cellListChanged, this);
      }
    }
  }

  private _cellListChanged(
    cells: IObservableUndoableList<ICellModel>,
    changed: IObservableList.IChangedArgs<ICellModel>
  ): void {
    console.log('cells changed');
    if ('add' === changed.type) {
      for (const cell of changed.newValues.values()) {
        if (!cell.metadata.has('mms')) {
          const uid = UUID.uuid4();
          console.log('adding mms cell id ' + uid);
          cell.metadata.set('mms', { id: uid });
        }
      }
    }
  }
}
export default extension;
