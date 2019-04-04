import reduceChildren from "./../reduce_children";
import {
  parseEventData,
  parseContentData,
} from "./schedule_elements";

/**
 * Parse entire schedule
 * @param {Element} node
 */
export default function parseSchedule(node) {
  return reduceChildren(node, (res, name, node) => {
    switch (name.toLowerCase()) {
      case "ns1:scheduledevent":
        // const action = node.attributes[0].value; //action
        res.push(parseScheduleEvent(node));
    }
    return res;
  }, []);

  /**
   * Parse schedule event.
   * A schedule event contains one or more schedule element.
   * @param {Element} node
   */
  function parseScheduleEvent(node) {
    return reduceChildren(node, (res, name, node) => {
      switch (name.toLowerCase()) {
        case "ns1:scheduleelements":
          const {
            eventData,
            contentData,
          } = parseScheduleElements(node);
          if (eventData && contentData) {
            if (eventData.video) {
              if (res.video === undefined) {
                res.video = [];
              }
              res.video.push({
                title: eventData.video.title,
                startTime: eventData.video.startTime,
                endTime: eventData.video.startTime + eventData.video.duration,
                affaire: contentData ? parseInt(contentData.prod) : undefined,
                pgrm: contentData ? parseInt(contentData.pgrm) : undefined,
                transitions: eventData.video.transitions,
                type: contentData ? contentData.type : undefined,
              });
            }
          } else if (eventData.overlay) {
            switch (eventData.overlay.type) {
              case "csa_picto":
                if (res.logo === undefined) {
                  res.logo = [];
                }
                res.logo.push({
                  title: eventData.overlay.title,
                  offset: eventData.overlay.offset,
                  transitions: eventData.overlay.transitions,
                });
                break;
              case "ppdt":
                if (res.ppdt === undefined) {
                  res.ppdt = [];
                }
                res.ppdt.push({
                  title: eventData.overlay.title,
                  offset: eventData.overlay.offset,
                  transitions: eventData.overlay.transitions,
                });
                break;
            }
          }
      }
      return res;
    }, {});
  }

  /**
   * Parse schedule element. May contain video, logo or ppdt data
   * @param {Element} node
   */
  function parseScheduleElements(node) {
    return reduceChildren(node, (res, name, node) => {
      switch (name.toLowerCase()) {
        case "ns1:eventdata":
          res.eventData = parseEventData(node);
          break;
        case "ns1:content":
          res.contentData = parseContentData(node);
          break;
      }
      return res;
    }, {});
  }
}