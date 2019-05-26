import Snabbdom from 'snabbdom-pragma'
import { last } from '../util'
import { formatNumber, formatJson, formatAmount } from './util'
import layout from './layout'
import search from './search'
import { txBox } from './tx'
import { assetTxsPerPage as perPage } from '../const'

const staticRoot = process.env.STATIC_ROOT || ''

export default ({ t, asset, assetTxs, goAsset, openTx, spends, tipHeight, loading, ...S }) => {
  if (!asset) return;

  // XXX does not currently support mempool transactions
  const chain_stats = asset.chain_stats
      , total_txs = chain_stats.tx_count
      , shown_txs = assetTxs ? assetTxs.length : 0

      // paging is on a best-effort basis, might act oddly if the set of transactions change
      // while the user is paging.
      , est_prev_total_seen_count  = goAsset.last_txids.length ? goAsset.est_chain_seen_count : 0
      , est_curr_chain_seen_count = goAsset.last_txids.length ? goAsset.est_chain_seen_count + shown_txs : shown_txs
      , last_seen_txid = (shown_txs > 0 && est_curr_chain_seen_count < chain_stats.tx_count) ? last(assetTxs).txid : null
      , next_paging_txids = last_seen_txid ? [ ...goAsset.last_txids, last_seen_txid ].join(',') : null
      , prev_paging_txids = goAsset.last_txids.length ? goAsset.last_txids.slice(0, -1).join(',') : null
      , prev_paging_est_count = goAsset.est_chain_seen_count ? Math.max(goAsset.est_chain_seen_count-perPage, 0) : 0

      , entity_type = asset.entity && Object.keys(asset.entity)[0]

  return layout(
    <div>
      <div className="jumbotron jumbotron-fluid asset-page">
        <div className="container">
          { search({ t, klass: 'page-search-bar' }) }
          <h1>{t`Asset`}</h1>
          <div className="block-hash">
            <span>{asset.asset_id}</span>
            { process.browser && <div className="code-button">
              <div className="code-button-btn" role="button" data-clipboardCopy={asset.asset_id}></div>
            </div> }
          </div>
        </div>
      </div>
      <div className="container">
        <div className="stats-table">
          <div>
            <div>{t`Issuance transaction`}</div>
            <div><a href={`tx/${asset.issuance_txin.txid}?input:${asset.issuance_txin.vin}`}>{`${asset.issuance_txin.txid}:${asset.issuance_txin.vin}`}</a></div>
          </div>

          <div>
            <div>{t`Contract hash`}</div>
            <div className="mono">{asset.contract_hash}</div>
          </div>

          { asset.entity && <div>
            <div>{t(`Linked ${entity_type}`)}</div>
            <div>{asset.entity[entity_type]}</div>
          </div> }

          { asset.ticker && <div>
            <div>{t`Ticker`}</div>
            <div>{asset.ticker}</div>
          </div> }

          { asset.name && <div>
            <div>{t`Description`}</div>
            <div>{asset.name}</div>
          </div> }

          <div>
            <div>{t`Decimal places`}</div>
            <div>{asset.precision || 0}</div>
          </div>

          <div>
            <div>{t`Total issued amount`}</div>
            <div>{chain_stats.has_blinded_issuances ? t`Confidential`
                 : formatAmount(chain_stats.issued_amount, asset.precision, t) }</div>
          </div>

          { chain_stats.tx_count > 0 && <div>
            <div>{t`Confirmed non-confidential tx count`}</div>
            <div>{formatNumber(chain_stats.tx_count)}</div>
          </div> }

          { asset.contract && <div>
            <div>{t`Contract JSON`}</div>
            <div className="mono contract-json">{formatJson(asset.contract)}</div>
          </div> }

        </div>

        <div>
          <div className="transactions">
            <h3>{txsShownText(total_txs, est_prev_total_seen_count, shown_txs, t)}</h3>
            <p className="text-muted">{t`(includes non-confidential transactions only)`}</p>
            { assetTxs ? assetTxs.map(tx => txBox(tx, { openTx, tipHeight, t, spends, ...S }))
                       : <img src="img/Loading.gif" className="loading-delay" /> }
          </div>

          <div className="load-more-container">
            <div>
              { loading ? <div className="load-more disabled"><span>{t`Load more`}</span><div><img src="img/Loading.gif" /></div></div>
                        : pagingNav(asset, last_seen_txid, est_curr_chain_seen_count, prev_paging_txids, next_paging_txids, prev_paging_est_count, t) }
            </div>
          </div>

        </div>
      </div>
    </div>
  , { t, ...S })
}

const fmtTxos = (count, sum, t) =>
  (count > 0 ? t`${formatNumber(count)} outputs` : t`No outputs`)
+ (sum > 0 ? ` (${formatSat(sum)})` : '')

const txsShownText = (total, start, shown, t) =>
  (total > perPage && shown > 0)
  ? t`${ start > 0 ? `${start}-${+start+shown}` : shown} of ${formatNumber(total)} Transactions`
  : t`${total} Transactions`

const pagingNav = (asset, last_seen_txid, est_curr_chain_seen_count, prev_paging_txids, next_paging_txids, prev_paging_est_count, t) =>
  process.browser

? last_seen_txid != null &&
    <div className="load-more" role="button" data-loadmoreTxsLastTxid={last_seen_txid} data-loadmoreTxsAsset={asset.asset_id}>
      <span>{t`Load more`}</span>
      <div><img alt="" src={`${staticRoot}img/icons/arrow_down.png`} /></div>
    </div>

: [
    prev_paging_txids != null &&
      <a className="load-more" href={`asset/${asset.asset_id}?txids=${prev_paging_txids}&c=${prev_paging_est_count}`}>
        <div><img alt="" src={`${staticRoot}img/icons/arrow_left_blu.png`} /></div>
        <span>{t`Newer`}</span>
      </a>
  , next_paging_txids != null &&
      <a className="load-more" href={`asset/${asset.asset_id}?txids=${next_paging_txids}&c=${est_curr_chain_seen_count}`}>
        <span>{t`Older`}</span>
        <div><img alt="" src={`${staticRoot}img/icons/arrow_right_blu.png`} /></div>
      </a>
  ]


