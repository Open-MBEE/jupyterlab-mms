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
import {
  CodeCellModel,
  ICellModel,
  MarkdownCellModel,
  RawCellModel
} from '@jupyterlab/cells';
import { IObservableUndoableList } from '@jupyterlab/observables';
import { IObservableList } from '@jupyterlab/observables/lib/observablelist';
import { ToolbarButton } from '@jupyterlab/apputils';
//import IContentFactory = NotebookModel.IContentFactory;
//import { IBaseCell, ICodeCell } from '@jupyterlab/nbformat';

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

    const testUpdateJson = {
      metadata: {
        mms: {
          id: '7de84b71-d244-482a-9976-7f99d69b81ab'
        }
      },
      source: 'some python code here for testing',
      id: '7de84b71-d244-482a-9976-7f99d69b81ab',
      // eslint-disable-next-line @typescript-eslint/camelcase
      cell_type: 'code'
    };
    const button1 = new ToolbarButton({
      className: 'myButton',
      iconClass: 'fa fa-fast-forward',
      onClick: () => {
        console.log('dummy test a cell update');
        widget.mmsCellUpdate(testUpdateJson);
      },
      tooltip: 'Test mms cell update'
    });
    const button2 = new ToolbarButton({
      className: 'myButton',
      iconClass: 'fa fa-fast-forward',
      onClick: () => {
        const uid = UUID.uuid4();
        const testAddJson = {
          metadata: {
            mms: {
              id: uid
            }
          },
          source: 'added cell',
          id: uid,
          // eslint-disable-next-line @typescript-eslint/camelcase
          cell_type: 'code'
        };
        console.log('dummy test a cell add');
        widget.mmsCellAdd(testAddJson, 0);
      },
      tooltip: 'Test mms cell add'
    });

    panel.toolbar.insertItem(0, 'testMmsCellUpdate', button1);
    panel.toolbar.insertItem(1, 'testMmsCellAdd', button2);
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
          if (!cell.metadata.has('mms')) {
            cell.metadata.set('mms', { id: UUID.uuid4() });
          }
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
      for (const cell of changed.oldValues.values()) {
        cell.contentChanged.disconnect(this._cellChanged, this);
        const mmsId = (cell.metadata.toJSON().mms as PartialJSONObject)
          .id as string;
        console.log('cell removed ' + mmsId);
        this._cellsMap.delete(mmsId);
      }
    }
    if ('set' === changed.type) {
      console.log('cell set?');
    }
    if ('move' === changed.type) {
      console.log('cell moved');
    }
    //send/update mms notebook cell references?
  }

  private _cellChanged(cellModel: ICellModel) {
    console.log('cell content changed ' + cellModel.value.text);
  }

  public mmsCellUpdate(json: any): void {
    console.log('simulate update first code cell ' + json);
    const cell = this._panel.model.cells.get(0);
    cell.value.text = json.source;
    //will need to handle cell type changes, etc, see @jupyterlab/cells models.ts
  }

  public mmsCellRemove(id: string): void {
    console.log('simulate remove cell ' + id);
    if (this._cellsMap.has(id)) {
      const cell = this._cellsMap.get(id);
      this._panel.model.cells.removeValue(cell);
      this._cellsMap.delete(id);
    }
  }

  public mmsCellAdd(json: any, index: number): void {
    console.log('simulate add cell ' + json);
    let cellModel: ICellModel = null;
    if (json.cell_type === 'code') {
      cellModel = new CodeCellModel({ cell: json });
    } else if (json.cell_type === 'markdown') {
      cellModel = new MarkdownCellModel({ cell: json });
    } else {
      cellModel = new RawCellModel({ cell: json });
    }
    this._panel.model.cells.insert(index, cellModel);
  }
}
export default extension;
