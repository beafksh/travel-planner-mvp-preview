import type { DaySpot } from '../lib/types';

/**
 * S04 와이어프레임 Day 2 (도쿄 · 아사쿠사·우에노) 기반 하드코딩 스팟.
 * wireframes/ 는 수정하지 않고 POC 전용 데이터로 유지.
 */
export const TOKYO_DAY2_SPOTS: DaySpot[] = [
  {
    order: 1,
    name: '센소지 (浅草寺)',
    lat: 35.7147651,
    lng: 139.7966553,
    time: '09:00',
    label: '관광',
  },
  {
    order: 2,
    name: '나카미세 거리',
    lat: 35.712064,
    lng: 139.795774,
    time: '10:30',
    label: '쇼핑',
  },
  {
    order: 3,
    name: '우에노 공원 · 단풍',
    lat: 35.714755,
    lng: 139.773431,
    time: '13:00',
    label: '자연',
  },
  {
    order: 4,
    name: '아메요코 (アメ横)',
    lat: 35.710062,
    lng: 139.774473,
    time: '15:30',
    label: '쇼핑',
  },
];
