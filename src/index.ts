import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

//import { requestAPI } from './jupyterlab-mms';
import { INotebookModel, NotebookPanel } from '@jupyterlab/notebook';
import { PartialJSONObject, UUID } from '@lumino/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDisposable } from '@lumino/disposable';
import { Widget } from '@lumino/widgets';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { ICellModel } from '@jupyterlab/cells';
import { IObservableUndoableList } from '@jupyterlab/observables';
import { IObservableList } from '@jupyterlab/observables/lib/observablelist';
import { ToolbarButton } from '@jupyterlab/apputils';

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
    const widget = new MmsNotebookWidget(panel, context);

    const callback = () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      const json = {
        metadata: {
          mms: {
            id: '7de84b71-d244-482a-9976-7f99d69b81ab'
          }
        },
        _modifier: 'admin',
        _docId: '8f902519-a6e9-4aae-be69-7c6aee2c2c30',
        source: 'some python code here for testing',
        _commitId: 'b1168114-e631-4909-8708-3df98c280b65',
        _inRefIds: ['master'],
        _creator: 'admin',
        // eslint-disable-next-line @typescript-eslint/camelcase
        _created: '2020-08-31T12:11:43.118-0700',
        id: '7de84b71-d244-482a-9976-7f99d69b81ab',
        // eslint-disable-next-line @typescript-eslint/camelcase
        cell_type: 'code',
        _refId: 'master',
        _modified: '2020-08-31T12:11:43.118-0700',
        _projectId: 'jupyter2'
      };
      console.log('dummy test a cell update');
      widget.mmsTestCellUpdate(json);
    };
    const button = new ToolbarButton({
      className: 'myButton',
      iconClass: 'fa fa-fast-forward',
      onClick: callback,
      tooltip: 'Test mms cell update'
    });

    panel.toolbar.insertItem(0, 'testMmsCellUpdate', button);

    return widget;
  }
}

class MmsNotebookWidget extends Widget {
  _panel: NotebookPanel;
  _context: DocumentRegistry.IContext<INotebookModel>;
  _cellsMap: Map<string, ICellModel>;
  _mmsNotebookId: string;

  constructor(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ) {
    super();
    this._panel = panel;
    this._context = context;
    this._cellsMap = new Map<string, ICellModel>();
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
        this._mmsNotebookId = (model.metadata.get('mms') as PartialJSONObject)
          .id as string;
        console.log('mms notebook opened ' + this._mmsNotebookId);
        model.cells.changed.connect(this._cellListChanged, this);
        const iter = model.cells.iter();
        let cell = iter.next();
        while (cell) {
          const mmsCellId = (cell.metadata.get('mms') as PartialJSONObject)
            .id as string;
          this._cellsMap.set(mmsCellId, cell);
          cell.contentChanged.connect(this._cellChanged, this);
          cell = iter.next();
        }
      }
    }
  }

  private _cellListChanged(
    cells: IObservableUndoableList<ICellModel>,
    changed: IObservableList.IChangedArgs<ICellModel>
  ): void {
    if ('add' === changed.type) {
      console.log('cell added');
      for (const cell of changed.newValues.values()) {
        if (!cell.metadata.has('mms')) {
          const uid = UUID.uuid4();
          console.log('adding mms cell id ' + uid);
          cell.metadata.set('mms', { id: uid });
        }
        cell.contentChanged.connect(this._cellChanged, this);
        const mmsId = (cell.metadata.toJSON().mms as PartialJSONObject)
          .id as string;
        this._cellsMap.set(mmsId, cell);
      }
    }
    if ('remove' === changed.type) {
      console.log('cell removed');
      for (const cell of changed.oldValues.values()) {
        const mmsId = (cell.metadata.toJSON().mms as PartialJSONObject)
          .id as string;
        this._cellsMap.delete(mmsId);
      }
    }
    //send/update mms notebook cell references?
  }

  private _cellChanged(cellModel: ICellModel) {
    console.log('cell content changed');
  }

  public mmsTestCellUpdate(json: any): void {
    console.log('simulate update first code cell');
    const cell = this._panel.model.cells.get(0);
    cell.value.text = json.source;
    //will need to handle cell type changes, etc, see @jupyterlab/cells models.ts
  }
}
export default extension;
