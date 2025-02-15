import { finalize, map } from 'rxjs/operators'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { AuthService, Notifier } from '@app/core'
import { objectKeysTyped } from '@peertube/peertube-core-utils'
import { ResultList, VideoSortField } from '@peertube/peertube-models'
import { CustomMarkupComponent } from './shared'
import { Observable } from 'rxjs'
import { MiniatureDisplayOptions, VideoMiniatureComponent } from '../../shared-video-miniature/video-miniature.component'
import { NgStyle, NgFor } from '@angular/common'
import { Video } from '@app/shared/shared-main/video/video.model'
import { VideoService } from '@app/shared/shared-main/video/video.service'

/*
 * Markup component list videos depending on criteria
*/

@Component({
  selector: 'my-videos-list-markup',
  templateUrl: 'videos-list-markup.component.html',
  styleUrls: [ 'videos-list-markup.component.scss' ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ NgStyle, NgFor, VideoMiniatureComponent ]
})
export class VideosListMarkupComponent implements CustomMarkupComponent, OnInit {
  @Input() sort: string
  @Input() categoryOneOf: number[]
  @Input() languageOneOf: string[]
  @Input() count: number
  @Input() onlyDisplayTitle: boolean
  @Input() isLocal: boolean
  @Input() isLive: boolean
  @Input() maxRows: number
  @Input() channelHandle: string
  @Input() accountHandle: string

  @Output() loaded = new EventEmitter<boolean>()

  videos: Video[]

  displayOptions: MiniatureDisplayOptions = {
    date: false,
    views: true,
    by: true,
    avatar: true,
    privacyLabel: false,
    privacyText: false,
    state: false,
    blacklistInfo: false
  }

  constructor (
    private auth: AuthService,
    private videoService: VideoService,
    private notifier: Notifier,
    private cd: ChangeDetectorRef
  ) { }

  getUser () {
    return this.auth.getUser()
  }

  limitRowsStyle () {
    if (this.maxRows <= 0) return {}

    return {
      'grid-template-rows': `repeat(${this.maxRows}, 1fr)`,
      'grid-auto-rows': '0', // Set height to 0 for autogenerated grid rows
      'overflow-y': 'hidden' // Hide grid items that overflow
    }
  }

  ngOnInit () {
    if (this.onlyDisplayTitle) {
      for (const key of objectKeysTyped(this.displayOptions)) {
        this.displayOptions[key] = false
      }
    }

    return this.getVideosObservable()
      .pipe(finalize(() => this.loaded.emit(true)))
      .subscribe({
        next: data => {
          this.videos = data
          this.cd.markForCheck()
        },

        error: err => this.notifier.error($localize`Error in videos list component: ${err.message}`)
      })
  }

  getVideosObservable () {
    const options = {
      videoPagination: {
        currentPage: 1,
        itemsPerPage: this.count
      },
      categoryOneOf: this.categoryOneOf,
      languageOneOf: this.languageOneOf,
      isLocal: this.isLocal,
      isLive: this.isLive,
      sort: this.sort as VideoSortField,
      account: { nameWithHost: this.accountHandle },
      videoChannel: { nameWithHost: this.channelHandle },
      skipCount: true
    }

    let obs: Observable<ResultList<Video>>

    if (this.channelHandle) obs = this.videoService.getVideoChannelVideos(options)
    else if (this.accountHandle) obs = this.videoService.getAccountVideos(options)
    else obs = this.videoService.getVideos(options)

    return obs.pipe(map(({ data }) => data))
  }
}
