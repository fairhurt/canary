/** Code samples shown next to the live examples on the demo page */

export const install = 'npm install sveltekit-canary';

export const basic = `<Feature flag="new-dashboard">
	<NewDashboard />

	{#snippet fallback()}
		<ClassicDashboard />
	{/snippet}
</Feature>`;

export const rollout = `{
	"features": {
		"gradual-rollout": {
			"enabled": true,
			"rollout": 50
		}
	}
}`;

export const groups = `{
	"features": {
		"beta-checkout": {
			"enabled": true,
			"userGroups": ["beta", "internal"]
		},
		"experimental-feature": {
			"enabled": false,
			"userGroups": ["internal"]
		}
	}
}`;

export const joinGroup = `import { joinGroup, getUserInfo, checkFeature } from 'sveltekit-canary';

// One round trip: the cookie is set and every
// feature on the page comes back re-evaluated
await joinGroup('beta').updates(getUserInfo, checkFeature);`;

export const variants = `{#snippet control()}<ClassicHero />{/snippet}
{#snippet variantA()}<BlueHero />{/snippet}
{#snippet variantB()}<VioletHero />{/snippet}

<Feature
	flag="ab-test-homepage"
	variants={{
		control,
		'variant-a': variantA,
		'variant-b': variantB
	}}
/>`;

export const routes = `{
	"routes": {
		"/dashboard": {
			"feature": "new-dashboard",
			"enabled": "/dashboard-v2",
			"disabled": "/dashboard-v1"
		},
		"/checkout": { "beta": "/checkout-beta" },
		"/checkout-beta": {
			"requiresGroup": "beta",
			"disabled": "/checkout"
		},
		"/admin": { "requiresGroup": "internal" }
	}
}`;

export const hooks = `import { initCanary, handleFeatureRouting } from 'sveltekit-canary';
import { sequence } from '@sveltejs/kit/hooks';
import config from './features.config.json';

initCanary({ config });

export const handle = sequence(handleFeatureRouting);`;
