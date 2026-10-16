import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { FetchBackend, HttpBackend, HttpClient } from '@angular/common/http';
import { ASSISTANT_STORAGE } from './core/services/assistant-conversation.service';
import { AssistantService } from './core/services/assistant.service';
import { App } from './app';
import { appConfig } from './app.config';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: AssistantService, useValue: { send: vi.fn() } },
        { provide: ASSISTANT_STORAGE, useValue: null },
      ],
      deferBlockBehavior: DeferBlockBehavior.Manual,
    }).compileComponents();
  });
  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('mounts the assistant on every page in a deferred block (Spec 001 RF-01, RF-02)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const [block, ...others] = await fixture.getDeferBlocks();

    expect(others).toEqual([]);
    expect(element.querySelector('app-assistant')).toBeNull();

    await block.render(DeferBlockState.Complete);
    expect(element.querySelector('app-assistant [data-launcher]')).not.toBeNull();
  });
});

describe('appConfig', () => {
  it('provides HttpClient backed by fetch', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
    expect(TestBed.inject(HttpClient)).toBeTruthy();
    expect(TestBed.inject(HttpBackend)).toBeInstanceOf(FetchBackend);
  });
});
