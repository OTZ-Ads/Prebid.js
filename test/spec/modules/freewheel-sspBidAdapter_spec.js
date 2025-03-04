import { expect } from 'chai';
import { spec } from 'modules/freewheel-sspBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { createEidsArray } from 'modules/userId/eids.js';
import { config } from 'src/config.js';

const ENDPOINT = '//ads.stickyadstv.com/www/delivery/swfIndex.php';
const PREBID_VERSION = '$prebid.version$';

describe('freewheelSSP BidAdapter Test', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValidForBanner', () => {
    let bid = {
      'bidder': 'freewheel-ssp',
      'params': {
        'zoneId': '277225'
      },
      'adUnitCode': 'adunit-code',
      'mediaTypes': {
        'banner': {
          'sizes': [
            [300, 250], [300, 600]
          ]
        }
      },
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        wrong: 'missing zone id'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('isBidRequestValidForVideo', () => {
    let bid = {
      'bidder': 'freewheel-ssp',
      'params': {
        'zoneId': '277225'
      },
      'adUnitCode': 'adunit-code',
      'mediaTypes': {
        'video': {
          'playerSize': [300, 250],
        }
      },
      'sizes': [[300, 250]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        wrong: 'missing zone id'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequestsForBanner', () => {
    let bidRequests = [
      {
        'bidder': 'freewheel-ssp',
        'params': {
          'zoneId': '277225',
          'bidfloor': 2.00,
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 250], [300, 600]
            ]
          }
        },
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'schain': {
          'ver': '1.0',
          'complete': 1,
          'nodes': [
            {
              'asi': 'example.com',
              'sid': '0',
              'hp': 1,
              'rid': 'bidrequestid',
              'domain': 'example.com'
            }
          ]
        }
      }
    ];

    it('should get correct value from content object', () => {
      config.setConfig({
        content: {
          'title': 'freewheel',
          'series': 'abc',
          'id': 'iris_5e7'
        }
      });

      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload._fw_prebid_content).to.deep.equal('{\"title\":\"freewheel\",\"series\":\"abc\",\"id\":\"iris_5e7\"}');
    });

    it('should get bidfloor value from params if no getFloor method', () => {
      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload._fw_bidfloor).to.equal(2.00);
      expect(payload._fw_bidfloorcur).to.deep.equal('USD');
    });

    it('should get bidfloor value from getFloor method if available', () => {
      const bidRequest = bidRequests[0];
      bidRequest.getFloor = () => ({ currency: 'USD', floor: 1.16 });
      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload._fw_bidfloor).to.equal(1.16);
      expect(payload._fw_bidfloorcur).to.deep.equal('USD');
    });

    it('should pass 3rd party IDs with the request when present', function () {
      const bidRequest = bidRequests[0];
      bidRequest.userIdAsEids = [
        {source: 'adserver.org', uids: [{id: 'TTD_ID_FROM_USER_ID_MODULE', atype: 1, ext: {rtiPartner: 'TDID'}}]},
        {source: 'admixer.net', uids: [{id: 'admixerId_FROM_USER_ID_MODULE', atype: 3}]},
        {source: 'adtelligent.com', uids: [{id: 'adtelligentId_FROM_USER_ID_MODULE', atype: 3}]},
      ];
      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload._fw_prebid_3p_UID).to.deep.equal(JSON.stringify([
        {source: 'adserver.org', uids: [{id: 'TTD_ID_FROM_USER_ID_MODULE', atype: 1, ext: {rtiPartner: 'TDID'}}]},
        {source: 'admixer.net', uids: [{id: 'admixerId_FROM_USER_ID_MODULE', atype: 3}]},
        {source: 'adtelligent.com', uids: [{id: 'adtelligentId_FROM_USER_ID_MODULE', atype: 3}]},
      ]));
    });

    it('should return empty bidFloorCurrency when bidfloor <= 0', () => {
      const bidRequest = bidRequests[0];
      bidRequest.getFloor = () => ({ currency: 'USD', floor: -1 });
      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload._fw_bidfloor).to.equal(0);
      expect(payload._fw_bidfloorcur).to.deep.equal('');
    });

    it('should add parameters to the tag', () => {
      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload.reqType).to.equal('AdsSetup');
      expect(payload.protocolVersion).to.equal('4.2');
      expect(payload.zoneId).to.equal('277225');
      expect(payload.componentId).to.equal('prebid');
      expect(payload.componentSubId).to.equal('mustang');
      expect(payload.playerSize).to.equal('300x600');
      expect(payload.pbjs_version).to.equal(PREBID_VERSION);
    });

    it('should return a properly formatted request with schain defined', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload.schain).to.deep.equal('{\"ver\":\"1.0\",\"complete\":1,\"nodes\":[{\"asi\":\"example.com\",\"sid\":\"0\",\"hp\":1,\"rid\":\"bidrequestid\",\"domain\":\"example.com\"}]}');
    });

    it('sends bid request to ENDPOINT via GET', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request[0].url).to.contain(ENDPOINT);
      expect(request[0].method).to.equal('GET');
    });

    it('should add usp consent to the request', () => {
      let uspConsentString = '1FW-SSP-uspConsent-';
      let bidderRequest = {};
      bidderRequest.uspConsent = uspConsentString;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request[0].data;
      expect(payload.reqType).to.equal('AdsSetup');
      expect(payload.protocolVersion).to.equal('4.2');
      expect(payload.zoneId).to.equal('277225');
      expect(payload.componentId).to.equal('prebid');
      expect(payload.componentSubId).to.equal('mustang');
      expect(payload.playerSize).to.equal('300x600');
      expect(payload._fw_us_privacy).to.exist.and.to.be.a('string');
      expect(payload._fw_us_privacy).to.equal(uspConsentString);
    });

    it('should add gdpr consent to the request', () => {
      let gdprConsentString = '1FW-SSP-gdprConsent-';
      let bidderRequest = {
        'gdprConsent': {
          'consentString': gdprConsentString
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request[0].data;
      expect(payload.reqType).to.equal('AdsSetup');
      expect(payload.protocolVersion).to.equal('4.2');
      expect(payload.zoneId).to.equal('277225');
      expect(payload.componentId).to.equal('prebid');
      expect(payload.componentSubId).to.equal('mustang');
      expect(payload.playerSize).to.equal('300x600');
      expect(payload._fw_gdpr_consent).to.exist.and.to.be.a('string');
      expect(payload._fw_gdpr_consent).to.equal(gdprConsentString);

      let gdprConsent = {
        'gdprApplies': true,
        'consentString': gdprConsentString
      }
      let syncOptions = {
        'pixelEnabled': true
      }
      const userSyncs = spec.getUserSyncs(syncOptions, null, gdprConsent, null, null);
      expect(userSyncs).to.deep.equal([{
        type: 'image',
        url: 'https://ads.stickyadstv.com/auto-user-sync?gdpr=1&gdpr_consent=1FW-SSP-gdprConsent-'
      }]);
    });

    it('should add gpp information to the request via bidderRequest.gppConsent', function () {
      let consentString = 'abc1234';
      let bidderRequest = {
        'gppConsent': {
          'gppString': consentString,
          'applicableSections': [8]
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request[0].data;

      expect(payload.gpp).to.equal(consentString);
      expect(payload.gpp_sid).to.deep.equal([8]);

      let gppConsent = {
        'applicableSections': [8],
        'gppString': consentString
      }
      let syncOptions = {
        'pixelEnabled': true
      }
      const userSyncs = spec.getUserSyncs(syncOptions, null, null, null, gppConsent);
      expect(userSyncs).to.deep.equal([{
        type: 'image',
        url: 'https://ads.stickyadstv.com/auto-user-sync?gpp=abc1234&gpp_sid[]=8'
      }]);
    });
  })

  describe('buildRequestsForVideo', () => {
    let bidRequests = [
      {
        'bidder': 'freewheel-ssp',
        'params': {
          'zoneId': '277225'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'video': {
            'playerSize': [300, 600],
          }
        },
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('should return context and placement with default values', () => {
      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload.video_context).to.equal(''); ;
      expect(payload.video_placement).to.equal(null);
      expect(payload.video_plcmt).to.equal(null);
    });

    it('should add parameters to the tag', () => {
      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload.reqType).to.equal('AdsSetup');
      expect(payload.protocolVersion).to.equal('4.2');
      expect(payload.zoneId).to.equal('277225');
      expect(payload.componentId).to.equal('prebid');
      expect(payload.componentSubId).to.equal('mustang');
      expect(payload.playerSize).to.equal('300x600');
    });

    it('sends bid request to ENDPOINT via GET', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request[0].url).to.contain(ENDPOINT);
      expect(request[0].method).to.equal('GET');
    });

    it('should add usp consent to the request', () => {
      let uspConsentString = '1FW-SSP-uspConsent-';
      let bidderRequest = {};
      bidderRequest.uspConsent = uspConsentString;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request[0].data;
      expect(payload.reqType).to.equal('AdsSetup');
      expect(payload.protocolVersion).to.equal('4.2');
      expect(payload.zoneId).to.equal('277225');
      expect(payload.componentId).to.equal('prebid');
      expect(payload.componentSubId).to.equal('mustang');
      expect(payload.playerSize).to.equal('300x600');
      expect(payload._fw_us_privacy).to.exist.and.to.be.a('string');
      expect(payload._fw_us_privacy).to.equal(uspConsentString);
    });

    it('should add gdpr consent to the request', () => {
      let gdprConsentString = '1FW-SSP-gdprConsent-';
      let bidderRequest = {
        'gdprConsent': {
          'consentString': gdprConsentString
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request[0].data;
      expect(payload.reqType).to.equal('AdsSetup');
      expect(payload.protocolVersion).to.equal('4.2');
      expect(payload.zoneId).to.equal('277225');
      expect(payload.componentId).to.equal('prebid');
      expect(payload.componentSubId).to.equal('mustang');
      expect(payload.playerSize).to.equal('300x600');
      expect(payload._fw_gdpr_consent).to.exist.and.to.be.a('string');
      expect(payload._fw_gdpr_consent).to.equal(gdprConsentString);

      let gdprConsent = {
        'gdprApplies': true,
        'consentString': gdprConsentString
      }
      let syncOptions = {
        'pixelEnabled': true
      }
      const userSyncs = spec.getUserSyncs(syncOptions, null, gdprConsent, null, null);
      expect(userSyncs).to.deep.equal([{
        type: 'image',
        url: 'https://ads.stickyadstv.com/auto-user-sync?gdpr=1&gdpr_consent=1FW-SSP-gdprConsent-'
      }]);
    });
  })

  describe('buildRequestsForVideoWithContextAndPlacement', () => {
    let bidRequests = [
      {
        'bidder': 'freewheel-ssp',
        'params': {
          'zoneId': '277225'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'video': {
            'context': 'outstream',
            'placement': 2,
            'plcmt': 3,
            'playerSize': [300, 600],
          }
        },
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('should return input context and placement', () => {
      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload.video_context).to.equal('outstream'); ;
      expect(payload.video_placement).to.equal(2);
      expect(payload.video_plcmt).to.equal(3);
    });
  })

  describe('interpretResponseForBanner', () => {
    let bidRequests = [
      {
        'bidder': 'freewheel-ssp',
        'params': {
          'zoneId': '277225'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 250], [300, 600]
            ]
          }
        },
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    let formattedBidRequests = [
      {
        'bidder': 'freewheel-ssp',
        'params': {
          'zoneId': '277225',
          'format': 'floorad'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 250], [300, 600]
            ]
          }
        },
        'sizes': [[600, 250], [300, 600]],
        'bidId': '30b3other1c1838de1e',
        'bidderRequestId': '22edbae273other3bf6',
        'auctionId': '1d1a03079test0a475',
      },
      {
        'bidder': 'stickyadstv',
        'params': {
          'zoneId': '277225',
          'format': 'test'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 600]
            ]
          }
        },
        'sizes': [[300, 600]],
        'bidId': '2',
        'bidderRequestId': '3',
        'auctionId': '4',
      }
    ];

    let response = '<?xml version=\'1.0\' encoding=\'UTF-8\'?><VAST version=\'4.2\'>' +
    '<Ad id=\'AdswizzAd28517153\'>' +
    '  <InLine>' +
    '   <AdSystem>Adswizz</AdSystem>' +
    '   <Impression id="dmp-1617899169-2513"></Impression>' +
    '   <Impression id="user-sync-1617899169-1">https://ads.stickyadstv.com/auto-user-sync?dealId=NRJ-PRO-12008</Impression>' +
    '   <Impression id="727435745">' +
    '   <![CDATA[ https://ads.stickyadstv.com/www/delivery/swfIndex.php?reqType=AdsDisplayStarted&dealId=NRJ-PRO-00008&campaignId=SMF-WOW-55555&adId=12345&viewKey=1607626986121029-54&sessionId=e3230a6bef6e0d2327422ff5282435&zoneId=2003&impId=1&cb=1932360&trackingIds=19651873%2C28161297%2C28161329%2C29847601%2C29967745%2C61392385&listenerId=eddf2aebad29655bb2b6abac276c50ef& ]]>' +
    '   </Impression>' +
    '   <Creatives>' +
    '    <Creative id=\'28517153\' sequence=\'1\'>' +
    '     <Linear>' +
    '      <Duration>00:00:09</Duration>' +
    '      <MediaFiles>' +
    '       <MediaFile delivery=\'progressive\' bitrate=\'129\' width=\'320\' height=\'240\' type=\'video/mp4\' scalable=\'true\' maintainAspectRatio=\'true\'><![CDATA[http://cdn.stickyadstv.com/www/images/28517153-web-MP4-59e47d565b2d9.mp4]]></MediaFile>' +
    '      </MediaFiles>' +
    '     </Linear>' +
    '    </Creative>' +
    '   </Creatives>' +
    '   <Extensions>' +
    '     <Extension type=\'StickyPricing\'><Price currency="EUR">0.2000</Price></Extension>' +
    '    </Extensions>' +
    '  </InLine>' +
    ' </Ad>' +
    '</VAST>';

    let ad = '<div id="freewheelssp_prebid_target"></div><script type=\'text/javascript\'>(function() {  var st = document.createElement(\'script\'); st.type = \'text/javascript\'; st.async = true;  st.src = \'http://cdn.stickyadstv.com/mustang/mustang.min.js\';  st.onload = function(){    var vastLoader = new window.com.stickyadstv.vast.VastLoader();    var vast = vastLoader.getVast();    var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();    vast.setXmlString(topWindow.freeheelssp_cache["adunit-code"]);    vastLoader.parseAds(vast, {      onSuccess: function() {var config = {      preloadedVast:vast,      autoPlay:true    };    var ad = new window.com.stickyadstv.vpaid.Ad(document.getElementById("freewheelssp_prebid_target"),config);    (new window.com.stickyadstv.tools.ASLoader(277225, \'mustang\')).registerEvents(ad);    ad.initAd(300,600,"",0,"",""); }    });  };  document.head.appendChild(st);})();</script>';
    let formattedAd = '<div id="freewheelssp_prebid_target"></div><script type=\'text/javascript\'>(function() {  var st = document.createElement(\'script\'); st.type = \'text/javascript\'; st.async = true;  st.src = \'http://cdn.stickyadstv.com/prime-time/floorad.min.js\';  st.onload = function(){    var vastLoader = new window.com.stickyadstv.vast.VastLoader();    var vast = vastLoader.getVast();    var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();    vast.setXmlString(topWindow.freeheelssp_cache["adunit-code"]);    vastLoader.parseAds(vast, {      onSuccess: function() {var config = {  preloadedVast:vast,  ASLoader:new window.com.stickyadstv.tools.ASLoader(277225, \'floorad\'),domId:"adunit-code"};window.com.stickyadstv.floorad.start(config); }    });  };  document.head.appendChild(st);})();</script>';

    it('should get correct bid response', () => {
      var request = spec.buildRequests(bidRequests);

      let expectedResponse = [
        {
          requestId: '30b31c1838de1e',
          cpm: '0.2000',
          width: 300,
          height: 600,
          creativeId: '28517153',
          currency: 'EUR',
          netRevenue: true,
          ttl: 360,
          dealId: 'NRJ-PRO-00008',
          campaignId: 'SMF-WOW-55555',
          bannerId: '12345',
          ad: ad
        }
      ];

      let result = spec.interpretResponse(response, request[0]);
      expect(result[0].meta.advertiserDomains).to.deep.equal([]);
      expect(result[0].dealId).to.equal('NRJ-PRO-00008');
      expect(result[0].campaignId).to.equal('SMF-WOW-55555');
      expect(result[0].bannerId).to.equal('12345');
    });

    it('should get correct bid response with formated ad', () => {
      var request = spec.buildRequests(formattedBidRequests);

      let expectedResponse = [
        {
          requestId: '30b31c1838de1e',
          cpm: '0.2000',
          width: 300,
          height: 600,
          creativeId: '28517153',
          currency: 'EUR',
          netRevenue: true,
          ttl: 360,
          dealId: 'NRJ-PRO-00008',
          campaignId: 'SMF-WOW-55555',
          bannerId: '12345',
          ad: formattedAd
        }
      ];

      let result = spec.interpretResponse(response, request[0]);
      expect(result[0].meta.advertiserDomains).to.deep.equal([]);
      expect(result[0].dealId).to.equal('NRJ-PRO-00008');
      expect(result[0].campaignId).to.equal('SMF-WOW-55555');
      expect(result[0].bannerId).to.equal('12345');
    });

    it('handles nobid responses', () => {
      var request = spec.buildRequests(formattedBidRequests);
      let response = '<?xml version=\'1.0\' encoding=\'UTF-8\'?><VAST version=\'4.2\'></VAST>';

      let result = spec.interpretResponse(response, request[0]);
      expect(result.length).to.equal(0);
    });
  });

  describe('interpretResponseForVideo', () => {
    let bidRequests = [
      {
        'bidder': 'freewheel-ssp',
        'params': {
          'zoneId': '277225'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'video': {
            'playerSize': [300, 600],
          }
        },
        'sizes': [[300, 400]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    let formattedBidRequests = [
      {
        'bidder': 'freewheel-ssp',
        'params': {
          'zoneId': '277225',
          'format': 'floorad'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'video': {
            'playerSize': [300, 600],
          }
        },
        'sizes': [[300, 400]],
        'bidId': '30b3other1c1838de1e',
        'bidderRequestId': '22edbae273other3bf6',
        'auctionId': '1d1a03079test0a475',
      },
      {
        'bidder': 'stickyadstv',
        'params': {
          'zoneId': '277225',
          'format': 'test'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'video': {
            'playerSize': [300, 600],
          }
        },
        'sizes': [[300, 400]],
        'bidId': '2',
        'bidderRequestId': '3',
        'auctionId': '4',
      },
      {
        'bidder': 'freewheelssp',
        'params': {
          'zoneId': '277225',
          'format': 'test'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'video': {
            'playerSize': [300, 600],
          }
        },
        'sizes': [[300, 400]],
        'bidId': '2',
        'bidderRequestId': '3',
        'auctionId': '4',
      }
    ];

    let response = '<?xml version=\'1.0\' encoding=\'UTF-8\'?><VAST version=\'4.2\'>' +
    '<Ad id=\'AdswizzAd28517153\'>' +
    '  <InLine>' +
    '   <AdSystem>Adswizz</AdSystem>' +
    '   <Impression id="dmp-1617899169-2513"></Impression>' +
    '   <Impression id="user-sync-1617899169-1">https://ads.stickyadstv.com/auto-user-sync?dealId=NRJ-PRO-00008</Impression>' +
    '   <Impression id="727435745">' +
    '   <![CDATA[ https://ads.stickyadstv.com/www/delivery/swfIndex.php?reqType=AdsDisplayStarted&dealId=NRJ-PRO-00008&campaignId=SMF-WOW-55555&adId=12345&rootViewKey=1607626986121029-54&sessionId=e3230a6bef6e0d2327422ff5282435&zoneId=2003&impId=1&cb=1932360&trackingIds=19651873%2C28161297%2C28161329%2C29847601%2C29967745%2C61392385&listenerId=eddf2aebad29655bb2b6abac276c50ef& ]]>' +
    '   </Impression>' +
    '   <Impression id="727435745">' +
    '   <![CDATA[ https://ads.stickyadstv.com/www/delivery/swfIndex.php?reqType=AdsDisplayStarted&dealId=NRJ-PRO-00128&campaignId=SMF-WOW-22222&adId=77777&sessionId=e3230a6bef6e0d2327422ff5282435&zoneId=2003&impId=1&cb=1932360&trackingIds=19651873%2C28161297%2C28161329%2C29847601%2C29967745%2C61392385&listenerId=eddf2aebad29655bb2b6abac276c50ef& ]]>' +
    '   </Impression>' +
    '   <Creatives>' +
    '    <Creative id=\'28517153\' sequence=\'1\'>' +
    '     <Linear>' +
    '      <Duration>00:00:09</Duration>' +
    '      <MediaFiles>' +
    '       <MediaFile delivery=\'progressive\' bitrate=\'129\' width=\'320\' height=\'240\' type=\'video/mp4\' scalable=\'true\' maintainAspectRatio=\'true\'><![CDATA[http://cdn.stickyadstv.com/www/images/28517153-web-MP4-59e47d565b2d9.mp4]]></MediaFile>' +
    '      </MediaFiles>' +
    '     </Linear>' +
    '    </Creative>' +
    '   </Creatives>' +
    '   <Extensions>' +
    '     <Extension type=\'StickyPricing\'><Price currency="EUR">0.2000</Price></Extension>' +
    '     <Extension type=\'StickyBrand\'><Domain><![CDATA[minotaur.com]]></Domain><Sector><![CDATA[BEAUTY & HYGIENE]]></Sector><Advertiser><![CDATA[James Bond Trademarks]]></Advertiser><Brand><![CDATA[007 Seven]]></Brand></Extension>' +
    '   </Extensions>' +
    '  </InLine>' +
    ' </Ad>' +
    '</VAST>';

    let ad = '<div id="freewheelssp_prebid_target"></div><script type=\'text/javascript\'>(function() {  var st = document.createElement(\'script\'); st.type = \'text/javascript\'; st.async = true;  st.src = \'http://cdn.stickyadstv.com/mustang/mustang.min.js\';  st.onload = function(){    var vastLoader = new window.com.stickyadstv.vast.VastLoader();    var vast = vastLoader.getVast();    var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();    vast.setXmlString(topWindow.freeheelssp_cache["adunit-code"]);    vastLoader.parseAds(vast, {      onSuccess: function() {var config = {      preloadedVast:vast,      autoPlay:true    };    var ad = new window.com.stickyadstv.vpaid.Ad(document.getElementById("freewheelssp_prebid_target"),config);    (new window.com.stickyadstv.tools.ASLoader(277225, \'mustang\')).registerEvents(ad);    ad.initAd(300,600,"",0,"",""); }    });  };  document.head.appendChild(st);})();</script>';
    let formattedAd = '<div id="freewheelssp_prebid_target"></div><script type=\'text/javascript\'>(function() {  var st = document.createElement(\'script\'); st.type = \'text/javascript\'; st.async = true;  st.src = \'http://cdn.stickyadstv.com/prime-time/floorad.min.js\';  st.onload = function(){    var vastLoader = new window.com.stickyadstv.vast.VastLoader();    var vast = vastLoader.getVast();    var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();    vast.setXmlString(topWindow.freeheelssp_cache["adunit-code"]);    vastLoader.parseAds(vast, {      onSuccess: function() {var config = {  preloadedVast:vast,  ASLoader:new window.com.stickyadstv.tools.ASLoader(277225, \'floorad\'),domId:"adunit-code"};window.com.stickyadstv.floorad.start(config); }    });  };  document.head.appendChild(st);})();</script>';

    it('should get correct bid response', () => {
      var request = spec.buildRequests(bidRequests);

      let expectedResponse = [
        {
          requestId: '30b31c1838de1e',
          cpm: '0.2000',
          width: 300,
          height: 600,
          creativeId: '28517153',
          currency: 'EUR',
          netRevenue: true,
          ttl: 360,
          dealId: 'NRJ-PRO-00008',
          campaignId: 'SMF-WOW-55555',
          bannerId: '12345',
          vastXml: response,
          mediaType: 'video',
          ad: ad,
          meta: {
            advertiserDomains: 'minotaur.com'
          }
        }
      ];

      let result = spec.interpretResponse(response, request[0]);
      expect(result[0].meta.advertiserDomains).to.deep.equal(['minotaur.com']);
      expect(result[0].dealId).to.equal('NRJ-PRO-00008');
      expect(result[0].campaignId).to.equal('SMF-WOW-55555');
      expect(result[0].bannerId).to.equal('12345');
    });

    it('should get correct bid response with formated ad', () => {
      var request = spec.buildRequests(formattedBidRequests);

      let expectedResponse = [
        {
          requestId: '30b31c1838de1e',
          cpm: '0.2000',
          width: 300,
          height: 600,
          creativeId: '28517153',
          currency: 'EUR',
          netRevenue: true,
          ttl: 360,
          dealId: 'NRJ-PRO-00008',
          campaignId: 'SMF-WOW-55555',
          bannerId: '12345',
          vastXml: response,
          mediaType: 'video',
          ad: formattedAd
        }
      ];

      let result = spec.interpretResponse(response, request[0]);
      expect(result[0].meta.advertiserDomains).to.deep.equal(['minotaur.com']);
      expect(result[0].dealId).to.equal('NRJ-PRO-00008');
      expect(result[0].campaignId).to.equal('SMF-WOW-55555');
      expect(result[0].bannerId).to.equal('12345');
    });

    it('handles nobid responses', () => {
      var request = spec.buildRequests(formattedBidRequests);
      let response = '<?xml version=\'1.0\' encoding=\'UTF-8\'?><VAST version=\'4.2\'></VAST>';

      let result = spec.interpretResponse(response, request[0]);
      expect(result.length).to.equal(0);
    });
  });
});
